package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type SpoolHandler struct{ db *pgxpool.Pool }

func NewSpoolHandler(db *pgxpool.Pool) *SpoolHandler { return &SpoolHandler{db: db} }

const spoolSelectSQL = `
	SELECT s.id_spool, s.id_user::text, s.id_filament::text, s.is_spooled, s.is_dry,
	       s.weight_remaining_grams, s.id_rack, s.notes, s.acquired_at, s.rfid_tag,
	       f.id_filament::text, f.title, f.color_hex, f.color_info, f.weight_grams,
	       f.material_type, f.filled_type, f.density,
	       f.nozzle_temp_min, f.nozzle_temp_max, f.bed_temp_min, f.bed_temp_max,
	       f.dry_temp, f.dry_time, f.id_brand::text, f.id_origin::text, f.created_at, f.updated_at,
	       f.image_url,
	       b.id_brand::text, b.name, b.empty_spool_weight_grams,
	       r.id_rack, r.name
	FROM user_filament_spool s
	JOIN filament f ON s.id_filament = f.id_filament
	JOIN brand b ON f.id_brand = b.id_brand
	LEFT JOIN rack r ON s.id_rack = r.id_rack
`

func scanSpool(rows interface {
	Scan(dest ...any) error
}) (models.Spool, error) {
	var s models.Spool
	s.Filament = &models.Filament{Brand: &models.Brand{}}
	var colorInfo []byte
	var rackID *int64
	var rackName *string
	err := rows.Scan(
		&s.IDSpool, &s.IDUser, &s.IDFilament, &s.IsSpooled, &s.IsDry,
		&s.WeightRemainingGrams, &rackID, &s.Notes, &s.AcquiredAt, &s.RFIDTag,
		&s.Filament.IDFilament, &s.Filament.Title, &s.Filament.ColorHex, &colorInfo, &s.Filament.WeightGrams,
		&s.Filament.MaterialType, &s.Filament.FilledType, &s.Filament.Density,
		&s.Filament.NozzleTempMin, &s.Filament.NozzleTempMax,
		&s.Filament.BedTempMin, &s.Filament.BedTempMax,
		&s.Filament.DryTemp, &s.Filament.DryTime,
		&s.Filament.IDBrand, &s.Filament.IDOrigin, &s.Filament.CreatedAt, &s.Filament.UpdatedAt,
		&s.Filament.ImageURL,
		&s.Filament.Brand.IDBrand, &s.Filament.Brand.Name, &s.Filament.Brand.EmptySpoolWeightGrams,
		&rackID, &rackName,
	)
	if err != nil {
		return s, err
	}
	if len(colorInfo) > 0 {
		s.Filament.ColorInfo = json.RawMessage(colorInfo)
	}
	if rackID != nil && rackName != nil {
		s.IDRack = rackID
		s.Rack = &models.RackRef{IDRack: *rackID, Name: *rackName}
	}
	return s, nil
}

// List godoc
// @Summary List spools
// @Tags spools
// @Produce json
// @Security BearerAuth
// @Param q query string false "Search query"
// @Param material query string false "Filter by material type"
// @Param rack_id query string false "Filter by rack ID ('none' for unracked)"
// @Param page query int false "Page"
// @Param per_page query int false "Per page"
// @Success 200 {array} models.Spool
// @Router /api/spools [get]
func (h *SpoolHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	q := r.URL.Query().Get("q")
	material := r.URL.Query().Get("material")
	rackIDParam := r.URL.Query().Get("rack_id")
	_, perPage, offset := pageParams(r)

	keywords := strings.Fields(q)

	params := []any{uid}
	paramIdx := 2
	conds := []string{"s.id_user = $1::uuid"}

	for _, kw := range keywords {
		conds = append(conds, fmt.Sprintf(
			"(f.title ILIKE '%%'||$%d||'%%' OR b.name ILIKE '%%'||$%d||'%%' OR f.material_type ILIKE '%%'||$%d||'%%')",
			paramIdx, paramIdx, paramIdx,
		))
		params = append(params, kw)
		paramIdx++
	}

	if material != "" {
		conds = append(conds, fmt.Sprintf("f.material_type = $%d", paramIdx))
		params = append(params, material)
		paramIdx++
	}

	if rackIDParam == "none" {
		conds = append(conds, "s.id_rack IS NULL")
	} else if rackIDParam != "" {
		conds = append(conds, fmt.Sprintf("s.id_rack::text = $%d", paramIdx))
		params = append(params, rackIDParam)
		paramIdx++
	}

	whereSQL := strings.Join(conds, " AND ")
	query := spoolSelectSQL + fmt.Sprintf(`
		WHERE %s
		ORDER BY s.acquired_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, paramIdx, paramIdx+1)
	params = append(params, perPage, offset)

	rows, err := h.db.Query(r.Context(), query, params...)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var spools []models.Spool
	for rows.Next() {
		s, err := scanSpool(rows)
		if err != nil {
			continue
		}
		spools = append(spools, s)
	}
	if spools == nil {
		spools = []models.Spool{}
	}
	respondJSON(w, http.StatusOK, spools)
}

// Get godoc
// @Summary Get a spool
// @Tags spools
// @Produce json
// @Security BearerAuth
// @Param id path int true "Spool ID"
// @Success 200 {object} models.Spool
// @Failure 404 {string} string "not found"
// @Router /api/spools/{id} [get]
func (h *SpoolHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	row := h.db.QueryRow(r.Context(), spoolSelectSQL+`
		WHERE s.id_spool=$1 AND s.id_user=$2::uuid
	`, id, uid)
	s, err := scanSpool(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// Create godoc
// @Summary Create a spool
// @Tags spools
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body SpoolCreateRequest true "Spool data"
// @Success 201 {object} models.Spool
// @Failure 400 {string} string "id_filament is required"
// @Router /api/spools [post]
func (h *SpoolHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		IDFilament           string  `json:"id_filament"`
		IsSpooled            bool    `json:"is_spooled"`
		IsDry                bool    `json:"is_dry"`
		WeightRemainingGrams float64 `json:"weight_remaining_grams"`
		IDRack               *int64  `json:"id_rack"`
		Notes                *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.IDFilament == "" {
		http.Error(w, "id_filament is required", http.StatusBadRequest)
		return
	}
	if req.WeightRemainingGrams == 0 {
		req.WeightRemainingGrams = 1000
	}

	var spoolID int64
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO user_filament_spool (id_user, id_filament, is_spooled, is_dry, weight_remaining_grams, id_rack, notes)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		RETURNING id_spool
	`, uid, req.IDFilament, req.IsSpooled, req.IsDry, req.WeightRemainingGrams, req.IDRack, req.Notes).
		Scan(&spoolID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, spoolID)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, s)
}

// Update godoc
// @Summary Update a spool
// @Tags spools
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Spool ID"
// @Param body body SpoolUpdateRequest true "Updated fields"
// @Success 200 {object} models.Spool
// @Failure 404 {string} string "not found"
// @Router /api/spools/{id} [put]
func (h *SpoolHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		IsSpooled            bool    `json:"is_spooled"`
		IsDry                bool    `json:"is_dry"`
		WeightRemainingGrams float64 `json:"weight_remaining_grams"`
		IDRack               *int64  `json:"id_rack"`
		Notes                *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	cmd, err := h.db.Exec(r.Context(), `
		UPDATE user_filament_spool
		SET is_spooled=$1, is_dry=$2, weight_remaining_grams=$3, id_rack=$4, notes=$5
		WHERE id_spool=$6 AND id_user=$7::uuid
	`, req.IsSpooled, req.IsDry, req.WeightRemainingGrams, req.IDRack, req.Notes, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, id)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// Delete godoc
// @Summary Delete a spool
// @Tags spools
// @Security BearerAuth
// @Param id path int true "Spool ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/spools/{id} [delete]
func (h *SpoolHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM user_filament_spool WHERE id_spool=$1 AND id_user=$2::uuid`, id, uid)
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

// UpdateWeight godoc
// @Summary Update remaining weight of a spool
// @Tags spools
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Spool ID"
// @Param body body WeightUpdateRequest true "New weight"
// @Success 200 {object} models.Spool
// @Failure 400 {string} string "weight must be > 0"
// @Failure 404 {string} string "not found"
// @Router /api/spools/{id}/weight [patch]
func (h *SpoolHandler) UpdateWeight(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		WeightRemainingGrams float64 `json:"weight_remaining_grams"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WeightRemainingGrams <= 0 {
		http.Error(w, "weight_remaining_grams must be > 0", http.StatusBadRequest)
		return
	}
	cmd, err := h.db.Exec(r.Context(), `
		UPDATE user_filament_spool SET weight_remaining_grams=$1
		WHERE id_spool=$2 AND id_user=$3::uuid
	`, req.WeightRemainingGrams, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, id)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// UpdateRack godoc
// @Summary Assign or unassign a spool from a rack
// @Tags spools
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Spool ID"
// @Param body body RackAssignRequest true "Rack ID (null to unassign)"
// @Success 200 {object} models.Spool
// @Failure 404 {string} string "not found"
// @Router /api/spools/{id}/rack [patch]
func (h *SpoolHandler) UpdateRack(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		IDRack *int64 `json:"id_rack"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	cmd, err := h.db.Exec(r.Context(), `
		UPDATE user_filament_spool SET id_rack=$1
		WHERE id_spool=$2 AND id_user=$3::uuid
	`, req.IDRack, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, id)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}
