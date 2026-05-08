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

type TagHandler struct{ db *pgxpool.Pool }

func NewTagHandler(db *pgxpool.Pool) *TagHandler { return &TagHandler{db: db} }

// List godoc
// @Summary List tags
// @Tags tags
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Tag
// @Router /api/tags [get]
func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	rows, err := h.db.Query(r.Context(), `
		SELECT id_tag, id_user::text, name, color, icon, created_at
		FROM user_tag WHERE id_user=$1::uuid ORDER BY name
	`, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.IDTag, &t.IDUser, &t.Name, &t.Color, &t.Icon, &t.CreatedAt); err != nil {
			continue
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []models.Tag{}
	}
	respondJSON(w, http.StatusOK, tags)
}

// Create godoc
// @Summary Create a tag
// @Tags tags
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body TagRequest true "Tag data"
// @Success 201 {object} models.Tag
// @Failure 400 {string} string "name is required"
// @Failure 409 {string} string "tag already exists"
// @Router /api/tags [post]
func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
		Icon  *string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	var t models.Tag
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO user_tag (id_user, name, color, icon)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id_tag, id_user::text, name, color, icon, created_at
	`, uid, req.Name, req.Color, req.Icon).
		Scan(&t.IDTag, &t.IDUser, &t.Name, &t.Color, &t.Icon, &t.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "tag already exists", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, t)
}

// Update godoc
// @Summary Update a tag
// @Tags tags
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Tag ID"
// @Param body body TagRequest true "Tag data"
// @Success 200 {object} models.Tag
// @Failure 404 {string} string "not found"
// @Router /api/tags/{id} [put]
func (h *TagHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
		Icon  *string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	var t models.Tag
	err := h.db.QueryRow(r.Context(), `
		UPDATE user_tag SET name=$1, color=$2, icon=$3
		WHERE id_tag=$4 AND id_user=$5::uuid
		RETURNING id_tag, id_user::text, name, color, icon, created_at
	`, req.Name, req.Color, req.Icon, id, uid).
		Scan(&t.IDTag, &t.IDUser, &t.Name, &t.Color, &t.Icon, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, t)
}

// Delete godoc
// @Summary Delete a tag
// @Tags tags
// @Security BearerAuth
// @Param id path int true "Tag ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/tags/{id} [delete]
func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM user_tag WHERE id_tag=$1 AND id_user=$2::uuid`, id, uid)
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
