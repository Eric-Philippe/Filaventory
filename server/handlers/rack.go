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

type RackHandler struct{ db *pgxpool.Pool }

func NewRackHandler(db *pgxpool.Pool) *RackHandler { return &RackHandler{db: db} }

// List godoc
// @Summary List racks
// @Tags racks
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Rack
// @Router /api/racks [get]
func (h *RackHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	rows, err := h.db.Query(r.Context(), `
		SELECT r.id_rack, r.name, r.description, r.max_capacity, r.id_user::text, r.created_at,
		       COUNT(s.id_spool) AS spool_count
		FROM rack r
		LEFT JOIN user_filament_spool s ON s.id_rack = r.id_rack
		WHERE r.id_user = $1::uuid
		GROUP BY r.id_rack
		ORDER BY r.name
	`, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var racks []models.Rack
	for rows.Next() {
		var rack models.Rack
		if err := rows.Scan(&rack.IDRack, &rack.Name, &rack.Description, &rack.MaxCapacity,
			&rack.IDUser, &rack.CreatedAt, &rack.SpoolCount); err != nil {
			continue
		}
		racks = append(racks, rack)
	}
	if racks == nil {
		racks = []models.Rack{}
	}
	respondJSON(w, http.StatusOK, racks)
}

// Get godoc
// @Summary Get a rack
// @Tags racks
// @Produce json
// @Security BearerAuth
// @Param id path int true "Rack ID"
// @Success 200 {object} models.Rack
// @Failure 404 {string} string "not found"
// @Router /api/racks/{id} [get]
func (h *RackHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var rack models.Rack
	err := h.db.QueryRow(r.Context(), `
		SELECT r.id_rack, r.name, r.description, r.max_capacity, r.id_user::text, r.created_at,
		       COUNT(s.id_spool) AS spool_count
		FROM rack r
		LEFT JOIN user_filament_spool s ON s.id_rack = r.id_rack
		WHERE r.id_rack = $1 AND r.id_user = $2::uuid
		GROUP BY r.id_rack
	`, id, uid).Scan(&rack.IDRack, &rack.Name, &rack.Description, &rack.MaxCapacity,
		&rack.IDUser, &rack.CreatedAt, &rack.SpoolCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, rack)
}

// Create godoc
// @Summary Create a rack
// @Tags racks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body RackRequest true "Rack data"
// @Success 201 {object} models.Rack
// @Failure 400 {string} string "name is required"
// @Failure 409 {string} string "rack name already exists"
// @Router /api/racks [post]
func (h *RackHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		MaxCapacity *int    `json:"max_capacity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	var rack models.Rack
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO rack (name, description, max_capacity, id_user)
		VALUES ($1, $2, $3, $4::uuid)
		RETURNING id_rack, name, description, max_capacity, id_user::text, created_at
	`, req.Name, req.Description, req.MaxCapacity, uid).
		Scan(&rack.IDRack, &rack.Name, &rack.Description, &rack.MaxCapacity, &rack.IDUser, &rack.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "rack name already exists", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, rack)
}

// Update godoc
// @Summary Update a rack
// @Tags racks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Rack ID"
// @Param body body RackRequest true "Rack data"
// @Success 200 {object} models.Rack
// @Failure 404 {string} string "not found"
// @Router /api/racks/{id} [put]
func (h *RackHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		MaxCapacity *int    `json:"max_capacity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	var rack models.Rack
	err := h.db.QueryRow(r.Context(), `
		UPDATE rack SET name=$1, description=$2, max_capacity=$3
		WHERE id_rack=$4 AND id_user=$5::uuid
		RETURNING id_rack, name, description, max_capacity, id_user::text, created_at
	`, req.Name, req.Description, req.MaxCapacity, id, uid).
		Scan(&rack.IDRack, &rack.Name, &rack.Description, &rack.MaxCapacity, &rack.IDUser, &rack.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, rack)
}

// Delete godoc
// @Summary Delete a rack
// @Tags racks
// @Security BearerAuth
// @Param id path int true "Rack ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/racks/{id} [delete]
func (h *RackHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM rack WHERE id_rack=$1 AND id_user=$2::uuid`, id, uid)
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
