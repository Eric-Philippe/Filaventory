package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type BrandHandler struct{ db *pgxpool.Pool }

func NewBrandHandler(db *pgxpool.Pool) *BrandHandler { return &BrandHandler{db: db} }

// List godoc
// @Summary List brands
// @Tags brands
// @Produce json
// @Security BearerAuth
// @Param q query string false "Search query"
// @Param page query int false "Page"
// @Param per_page query int false "Per page"
// @Success 200 {object} object{data=[]models.Brand,total=int,page=int,per_page=int}
// @Router /api/brands [get]
func (h *BrandHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	q := r.URL.Query().Get("q")
	page, perPage, offset := pageParams(r)

	rows, err := h.db.Query(r.Context(), `
		SELECT id_brand::text, id_origin::text, name, website, empty_spool_weight_grams, created_at,
		       COUNT(*) OVER() AS total
		FROM brand
		WHERE (id_origin IS NULL OR id_origin = $1::uuid)
		  AND ($2 = '' OR name ILIKE '%' || $2 || '%')
		ORDER BY name
		LIMIT $3 OFFSET $4
	`, uid, q, perPage, offset)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var brands []models.Brand
	var total int
	for rows.Next() {
		var b models.Brand
		if err := rows.Scan(&b.IDBrand, &b.IDOrigin, &b.Name, &b.Website,
			&b.EmptySpoolWeightGrams, &b.CreatedAt, &total); err != nil {
			continue
		}
		brands = append(brands, b)
	}
	if brands == nil {
		brands = []models.Brand{}
	}
	respondJSON(w, http.StatusOK, PagedResponse[models.Brand]{Data: brands, Total: total, Page: page, PerPage: perPage})
}

// Get godoc
// @Summary Get a brand
// @Tags brands
// @Produce json
// @Security BearerAuth
// @Param id path string true "Brand UUID"
// @Success 200 {object} models.Brand
// @Failure 404 {string} string "not found"
// @Router /api/brands/{id} [get]
func (h *BrandHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")

	var b models.Brand
	err := h.db.QueryRow(r.Context(), `
		SELECT id_brand::text, id_origin::text, name, website, empty_spool_weight_grams, created_at
		FROM brand WHERE id_brand = $1::uuid AND (id_origin IS NULL OR id_origin = $2::uuid)
	`, id, uid).Scan(&b.IDBrand, &b.IDOrigin, &b.Name, &b.Website, &b.EmptySpoolWeightGrams, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, b)
}

// Create godoc
// @Summary Create a brand
// @Tags brands
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body BrandRequest true "Brand data"
// @Success 201 {object} models.Brand
// @Failure 400 {string} string "name is required"
// @Failure 409 {string} string "brand already exists"
// @Router /api/brands [post]
func (h *BrandHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		Name                  string   `json:"name"`
		Website               *string  `json:"website"`
		EmptySpoolWeightGrams *float64 `json:"empty_spool_weight_grams"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	var b models.Brand
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO brand (id_origin, name, website, empty_spool_weight_grams)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id_brand::text, id_origin::text, name, website, empty_spool_weight_grams, created_at
	`, uid, req.Name, req.Website, req.EmptySpoolWeightGrams).
		Scan(&b.IDBrand, &b.IDOrigin, &b.Name, &b.Website, &b.EmptySpoolWeightGrams, &b.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "brand already exists", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, b)
}

// Update godoc
// @Summary Update a brand
// @Tags brands
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Brand UUID"
// @Param body body BrandRequest true "Brand data"
// @Success 200 {object} models.Brand
// @Failure 404 {string} string "not found"
// @Router /api/brands/{id} [put]
func (h *BrandHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		Name                  string   `json:"name"`
		Website               *string  `json:"website"`
		EmptySpoolWeightGrams *float64 `json:"empty_spool_weight_grams"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	var b models.Brand
	err := h.db.QueryRow(r.Context(), `
		UPDATE brand SET name=$1, website=$2, empty_spool_weight_grams=$3
		WHERE id_brand=$4::uuid AND id_origin=$5::uuid
		RETURNING id_brand::text, id_origin::text, name, website, empty_spool_weight_grams, created_at
	`, req.Name, req.Website, req.EmptySpoolWeightGrams, id, uid).
		Scan(&b.IDBrand, &b.IDOrigin, &b.Name, &b.Website, &b.EmptySpoolWeightGrams, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, b)
}

// Delete godoc
// @Summary Delete a brand
// @Tags brands
// @Security BearerAuth
// @Param id path string true "Brand UUID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/brands/{id} [delete]
func (h *BrandHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM brand WHERE id_brand=$1::uuid AND id_origin=$2::uuid`, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
