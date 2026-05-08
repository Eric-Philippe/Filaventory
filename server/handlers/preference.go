package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type PreferenceHandler struct{ db *pgxpool.Pool }

func NewPreferenceHandler(db *pgxpool.Pool) *PreferenceHandler {
	return &PreferenceHandler{db: db}
}

// Get godoc
// @Summary Get filament preference
// @Tags preferences
// @Produce json
// @Security BearerAuth
// @Param filament_id path string true "Filament UUID"
// @Success 200 {object} models.Preference
// @Failure 404 {string} string "not found"
// @Router /api/preferences/{filament_id} [get]
func (h *PreferenceHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	filamentID := chi.URLParam(r, "filament_id")

	var p models.Preference
	err := h.db.QueryRow(r.Context(), `
		SELECT id_user::text, id_filament::text, nozzle_temp_override, bed_temp_override,
		       ironing_flow, ironing_speed, notes
		FROM filament_preference
		WHERE id_user=$1::uuid AND id_filament=$2::uuid
	`, uid, filamentID).Scan(
		&p.IDUser, &p.IDFilament, &p.NozzleTempOverride, &p.BedTempOverride,
		&p.IroningFlow, &p.IroningSpeed, &p.Notes,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, p)
}

// Upsert godoc
// @Summary Create or update filament preference
// @Tags preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param filament_id path string true "Filament UUID"
// @Param body body PreferenceRequest true "Preference data"
// @Success 200 {object} models.Preference
// @Router /api/preferences/{filament_id} [put]
func (h *PreferenceHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	filamentID := chi.URLParam(r, "filament_id")

	var req struct {
		NozzleTempOverride *int16  `json:"nozzle_temp_override"`
		BedTempOverride    *int16  `json:"bed_temp_override"`
		IroningFlow        *int16  `json:"ironing_flow"`
		IroningSpeed       *int16  `json:"ironing_speed"`
		Notes              *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	var p models.Preference
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO filament_preference (id_user, id_filament, nozzle_temp_override, bed_temp_override,
		                                 ironing_flow, ironing_speed, notes)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		ON CONFLICT (id_user, id_filament) DO UPDATE
		    SET nozzle_temp_override=EXCLUDED.nozzle_temp_override,
		        bed_temp_override=EXCLUDED.bed_temp_override,
		        ironing_flow=EXCLUDED.ironing_flow,
		        ironing_speed=EXCLUDED.ironing_speed,
		        notes=EXCLUDED.notes
		RETURNING id_user::text, id_filament::text, nozzle_temp_override, bed_temp_override,
		          ironing_flow, ironing_speed, notes
	`, uid, filamentID, req.NozzleTempOverride, req.BedTempOverride,
		req.IroningFlow, req.IroningSpeed, req.Notes,
	).Scan(
		&p.IDUser, &p.IDFilament, &p.NozzleTempOverride, &p.BedTempOverride,
		&p.IroningFlow, &p.IroningSpeed, &p.Notes,
	)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, p)
}

// Delete godoc
// @Summary Delete filament preference
// @Tags preferences
// @Security BearerAuth
// @Param filament_id path string true "Filament UUID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/preferences/{filament_id} [delete]
func (h *PreferenceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	filamentID := chi.URLParam(r, "filament_id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM filament_preference WHERE id_user=$1::uuid AND id_filament=$2::uuid`, uid, filamentID)
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
