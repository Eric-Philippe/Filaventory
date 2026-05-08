package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type FilamentHandler struct{ db *pgxpool.Pool }

func NewFilamentHandler(db *pgxpool.Pool) *FilamentHandler { return &FilamentHandler{db: db} }

// List godoc
// @Summary List filaments
// @Tags filaments
// @Produce json
// @Security BearerAuth
// @Param q query string false "Full-text search (brand, title, material)"
// @Param materials query []string false "Filter by material types"
// @Param brand_id query string false "Filter by brand UUID"
// @Param sort_by query string false "Sort field: title|brand|material|nozzle|bed|weight"
// @Param sort_dir query string false "Sort direction: asc|desc"
// @Param page query int false "Page"
// @Param per_page query int false "Per page"
// @Success 200 {object} object{data=[]models.Filament,total=int,page=int,per_page=int}
// @Router /api/filaments [get]
func (h *FilamentHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	q := r.URL.Query().Get("q")
	materialParams := r.URL.Query()["materials"]
	brandID := r.URL.Query().Get("brand_id")
	page, perPage, offset := pageParams(r)
	sortBy := r.URL.Query().Get("sort_by")
	sortDir := r.URL.Query().Get("sort_dir")

	// Keyword-based search: split by whitespace, each word must match
	keywords := strings.Fields(q)

	params := []any{uid}
	paramIdx := 2
	conds := []string{"(f.id_origin IS NULL OR f.id_origin = $1::uuid)"}

	for _, kw := range keywords {
		conds = append(conds, fmt.Sprintf(
			"(f.title ILIKE '%%'||$%d||'%%' OR b.name ILIKE '%%'||$%d||'%%' OR f.material_type ILIKE '%%'||$%d||'%%')",
			paramIdx, paramIdx, paramIdx,
		))
		params = append(params, kw)
		paramIdx++
	}

	var materialFilters []string
	for _, raw := range materialParams {
		for _, part := range strings.Split(raw, ",") {
			if v := strings.TrimSpace(part); v != "" {
				materialFilters = append(materialFilters, v)
			}
		}
	}
	if len(materialFilters) > 0 {
		conds = append(conds, fmt.Sprintf("f.material_type = ANY($%d)", paramIdx))
		params = append(params, materialFilters)
		paramIdx++
	}
	if brandID != "" {
		conds = append(conds, fmt.Sprintf("f.id_brand::text = $%d", paramIdx))
		params = append(params, brandID)
		paramIdx++
	}

	whereSQL := strings.Join(conds, " AND ")

	orderExpr := "b.name, f.title"
	dir := "ASC"
	if strings.ToLower(sortDir) == "desc" {
		dir = "DESC"
	}
	switch sortBy {
	case "title":
		orderExpr = "f.title " + dir
	case "brand":
		orderExpr = "b.name " + dir + ", f.title"
	case "material":
		orderExpr = "f.material_type " + dir + ", f.title"
	case "nozzle":
		orderExpr = "f.nozzle_temp_min " + dir + " NULLS LAST, f.title"
	case "bed":
		orderExpr = "f.bed_temp_min " + dir + " NULLS LAST, f.title"
	case "weight":
		orderExpr = "f.weight_grams " + dir + ", f.title"
	}

	query := fmt.Sprintf(`
		SELECT f.id_filament::text, f.title, f.color_hex, f.color_info, f.weight_grams,
		       f.material_type, f.filled_type, f.density,
		       f.nozzle_temp_min, f.nozzle_temp_max, f.bed_temp_min, f.bed_temp_max,
		       f.dry_temp, f.dry_time, f.id_brand::text, f.id_origin::text,
		       f.created_at, f.updated_at, f.image_url,
		       b.id_brand::text, b.name, b.website, b.empty_spool_weight_grams,
		       COUNT(*) OVER() AS total
		FROM filament f
		JOIN brand b ON f.id_brand = b.id_brand
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderExpr, paramIdx, paramIdx+1)
	params = append(params, perPage, offset)

	rows, err := h.db.Query(r.Context(), query, params...)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var filaments []models.Filament
	var total int
	for rows.Next() {
		var f models.Filament
		f.Brand = &models.Brand{}
		var colorInfo []byte
		if err := rows.Scan(
			&f.IDFilament, &f.Title, &f.ColorHex, &colorInfo, &f.WeightGrams,
			&f.MaterialType, &f.FilledType, &f.Density,
			&f.NozzleTempMin, &f.NozzleTempMax, &f.BedTempMin, &f.BedTempMax,
			&f.DryTemp, &f.DryTime, &f.IDBrand, &f.IDOrigin,
			&f.CreatedAt, &f.UpdatedAt, &f.ImageURL,
			&f.Brand.IDBrand, &f.Brand.Name, &f.Brand.Website, &f.Brand.EmptySpoolWeightGrams,
			&total,
		); err != nil {
			continue
		}
		if len(colorInfo) > 0 {
			f.ColorInfo = json.RawMessage(colorInfo)
		}
		filaments = append(filaments, f)
	}
	if filaments == nil {
		filaments = []models.Filament{}
	}
	respondJSON(w, http.StatusOK, PagedResponse[models.Filament]{Data: filaments, Total: total, Page: page, PerPage: perPage})
}

// Materials godoc
// @Summary List distinct material types
// @Tags filaments
// @Produce json
// @Security BearerAuth
// @Success 200 {array} string
// @Router /api/filaments/materials [get]
func (h *FilamentHandler) Materials(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	rows, err := h.db.Query(r.Context(), `
		SELECT DISTINCT material_type FROM filament
		WHERE id_origin IS NULL OR id_origin = $1::uuid
		ORDER BY material_type
	`, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var materials []string
	for rows.Next() {
		var m string
		_ = rows.Scan(&m)
		materials = append(materials, m)
	}
	if materials == nil {
		materials = []string{}
	}
	respondJSON(w, http.StatusOK, materials)
}

// Get godoc
// @Summary Get a filament
// @Tags filaments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Filament UUID"
// @Success 200 {object} models.Filament
// @Failure 404 {string} string "not found"
// @Router /api/filaments/{id} [get]
func (h *FilamentHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")

	var f models.Filament
	f.Brand = &models.Brand{}
	var colorInfo []byte
	err := h.db.QueryRow(r.Context(), `
		SELECT f.id_filament::text, f.title, f.color_hex, f.color_info, f.weight_grams,
		       f.material_type, f.filled_type, f.density,
		       f.nozzle_temp_min, f.nozzle_temp_max, f.bed_temp_min, f.bed_temp_max,
		       f.dry_temp, f.dry_time, f.id_brand::text, f.id_origin::text,
		       f.created_at, f.updated_at, f.image_url,
		       b.id_brand::text, b.name, b.website, b.empty_spool_weight_grams
		FROM filament f
		JOIN brand b ON f.id_brand = b.id_brand
		WHERE f.id_filament = $1::uuid
		  AND (f.id_origin IS NULL OR f.id_origin = $2::uuid)
	`, id, uid).Scan(
		&f.IDFilament, &f.Title, &f.ColorHex, &colorInfo, &f.WeightGrams,
		&f.MaterialType, &f.FilledType, &f.Density,
		&f.NozzleTempMin, &f.NozzleTempMax, &f.BedTempMin, &f.BedTempMax,
		&f.DryTemp, &f.DryTime, &f.IDBrand, &f.IDOrigin,
		&f.CreatedAt, &f.UpdatedAt, &f.ImageURL,
		&f.Brand.IDBrand, &f.Brand.Name, &f.Brand.Website, &f.Brand.EmptySpoolWeightGrams,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if len(colorInfo) > 0 {
		f.ColorInfo = json.RawMessage(colorInfo)
	}
	respondJSON(w, http.StatusOK, f)
}

type filamentRequest struct {
	Title         string  `json:"title"`
	ColorHex      string  `json:"color_hex"`
	WeightGrams   int     `json:"weight_grams"`
	ImageURL      *string `json:"image_url"`
	MaterialType  string  `json:"material_type"`
	FilledType    *string `json:"filled_type"`
	Density       float64 `json:"density"`
	NozzleTempMin *int16  `json:"nozzle_temp_min"`
	NozzleTempMax *int16  `json:"nozzle_temp_max"`
	BedTempMin    *int16  `json:"bed_temp_min"`
	BedTempMax    *int16  `json:"bed_temp_max"`
	DryTemp       *int16  `json:"dry_temp"`
	DryTime       *int16  `json:"dry_time"`
	IDBrand       string  `json:"id_brand"`
}

// Create godoc
// @Summary Create a filament
// @Tags filaments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body FilamentRequest true "Filament data"
// @Success 201 {object} models.Filament
// @Failure 400 {string} string "validation error"
// @Router /api/filaments [post]
func (h *FilamentHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req filamentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.ColorHex == "" || req.MaterialType == "" || req.IDBrand == "" {
		http.Error(w, "title, color_hex, material_type, id_brand are required", http.StatusBadRequest)
		return
	}
	if req.Density == 0 {
		req.Density = 1.24
	}
	if req.WeightGrams == 0 {
		req.WeightGrams = 1000
	}

	if req.ImageURL != nil {
		fmt.Printf("Creating filament with image URL: %s\n", *req.ImageURL)
	}

	var f models.Filament
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO filament (title, color_hex, weight_grams, image_url, material_type, filled_type, density,
		                      nozzle_temp_min, nozzle_temp_max, bed_temp_min, bed_temp_max,
		                      dry_temp, dry_time, id_brand, id_origin)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::uuid, $15::uuid)
		RETURNING id_filament::text, title, color_hex, weight_grams, image_url,
		material_type,
		          filled_type, density, nozzle_temp_min, nozzle_temp_max,
		          bed_temp_min, bed_temp_max, dry_temp, dry_time,
		          id_brand::text, id_origin::text, created_at, updated_at
	`, req.Title, req.ColorHex, req.WeightGrams, req.ImageURL, req.MaterialType, req.FilledType, req.Density,
		req.NozzleTempMin, req.NozzleTempMax, req.BedTempMin, req.BedTempMax,
		req.DryTemp, req.DryTime, req.IDBrand, uid,
	).Scan(
		&f.IDFilament, &f.Title, &f.ColorHex, &f.WeightGrams, &f.ImageURL,
		&f.MaterialType,
		&f.FilledType, &f.Density, &f.NozzleTempMin, &f.NozzleTempMax,
		&f.BedTempMin, &f.BedTempMax, &f.DryTemp, &f.DryTime,
		&f.IDBrand, &f.IDOrigin, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			http.Error(w, "Brand not found", http.StatusBadRequest)
			return
		}
		fmt.Printf("Error inserting filament: %v\n", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, f)
}

// Update godoc
// @Summary Update a filament
// @Tags filaments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Filament UUID"
// @Param body body FilamentRequest true "Filament data"
// @Success 200 {object} models.Filament
// @Failure 404 {string} string "not found"
// @Router /api/filaments/{id} [put]
func (h *FilamentHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req filamentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	var f models.Filament
	err := h.db.QueryRow(r.Context(), `
		UPDATE filament SET title=$1, color_hex=$2, weight_grams=$3, material_type=$4,
		    filled_type=$5, density=$6, nozzle_temp_min=$7, nozzle_temp_max=$8,
		    bed_temp_min=$9, bed_temp_max=$10, dry_temp=$11, dry_time=$12, updated_at=NOW()
		WHERE id_filament=$13::uuid AND id_origin=$14::uuid
		RETURNING id_filament::text, title, color_hex, weight_grams, material_type,
		          filled_type, density, nozzle_temp_min, nozzle_temp_max,
		          bed_temp_min, bed_temp_max, dry_temp, dry_time,
		          id_brand::text, id_origin::text, created_at, updated_at
	`, req.Title, req.ColorHex, req.WeightGrams, req.MaterialType, req.FilledType, req.Density,
		req.NozzleTempMin, req.NozzleTempMax, req.BedTempMin, req.BedTempMax,
		req.DryTemp, req.DryTime, id, uid,
	).Scan(
		&f.IDFilament, &f.Title, &f.ColorHex, &f.WeightGrams, &f.MaterialType,
		&f.FilledType, &f.Density, &f.NozzleTempMin, &f.NozzleTempMax,
		&f.BedTempMin, &f.BedTempMax, &f.DryTemp, &f.DryTime,
		&f.IDBrand, &f.IDOrigin, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, f)
}

// Delete godoc
// @Summary Delete a filament
// @Tags filaments
// @Security BearerAuth
// @Param id path string true "Filament UUID"
// @Success 204
// @Failure 409 {string} string "filament is in use by a spool"
// @Failure 404 {string} string "not found"
// @Router /api/filaments/{id} [delete]
func (h *FilamentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM filament WHERE id_filament=$1::uuid AND id_origin=$2::uuid`, id, uid)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			http.Error(w, "filament is in use by a spool", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
