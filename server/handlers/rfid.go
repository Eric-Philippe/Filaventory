package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RFIDHandler struct{ db *pgxpool.Pool }

func NewRFIDHandler(db *pgxpool.Pool) *RFIDHandler { return &RFIDHandler{db: db} }

// Assign godoc
// @Summary Assign an RFID tag to a spool
// @Tags rfid
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body RFIDAssignRequest true "Assign payload"
// @Success 200 {object} models.Spool
// @Failure 400 {string} string "id_spool and rfid_tag required"
// @Failure 404 {string} string "spool not found"
// @Router /api/rfid/assign [post]
func (h *RFIDHandler) Assign(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		IDSpool int64  `json:"id_spool"`
		RFIDTag string `json:"rfid_tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.IDSpool == 0 || req.RFIDTag == "" {
		http.Error(w, "id_spool and rfid_tag required", http.StatusBadRequest)
		return
	}

	cmd, err := h.db.Exec(r.Context(),
		`UPDATE user_filament_spool SET rfid_tag=$1 WHERE id_spool=$2 AND id_user=$3::uuid`,
		req.RFIDTag, req.IDSpool, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "spool not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, req.IDSpool)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// Unassign godoc
// @Summary Remove RFID tag from a spool
// @Tags rfid
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object{id_spool=int} true "Spool ID"
// @Success 200 {object} models.Spool
// @Failure 404 {string} string "spool not found"
// @Router /api/rfid/assign [delete]
func (h *RFIDHandler) Unassign(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		IDSpool int64 `json:"id_spool"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.IDSpool == 0 {
		http.Error(w, "id_spool required", http.StatusBadRequest)
		return
	}

	cmd, err := h.db.Exec(r.Context(),
		`UPDATE user_filament_spool SET rfid_tag=NULL WHERE id_spool=$1 AND id_user=$2::uuid`,
		req.IDSpool, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "spool not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, req.IDSpool)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// UpdateWeightByRFID godoc
// @Summary Update spool weight by RFID tag (API key auth)
// @Tags rfid
// @Accept json
// @Produce json
// @Param X-API-Key header string true "API key"
// @Param body body RFIDWeightRequest true "Weight update"
// @Success 200 {object} models.Spool
// @Failure 400 {string} string "rfid_tag and weight required"
// @Failure 404 {string} string "no spool with that rfid_tag"
// @Router /api/rfid/weight [patch]
func (h *RFIDHandler) UpdateWeightByRFID(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		RFIDTag              string  `json:"rfid_tag"`
		WeightRemainingGrams float64 `json:"weight_remaining_grams"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RFIDTag == "" || req.WeightRemainingGrams <= 0 {
		http.Error(w, "rfid_tag and weight_remaining_grams (>0) required", http.StatusBadRequest)
		return
	}

	cmd, err := h.db.Exec(r.Context(),
		`UPDATE user_filament_spool SET weight_remaining_grams=$1 WHERE rfid_tag=$2 AND id_user=$3::uuid`,
		req.WeightRemainingGrams, req.RFIDTag, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "no spool with that rfid_tag", http.StatusNotFound)
		return
	}

	var spoolID int64
	_ = h.db.QueryRow(r.Context(),
		`SELECT id_spool FROM user_filament_spool WHERE rfid_tag=$1 AND id_user=$2::uuid`,
		req.RFIDTag, uid).Scan(&spoolID)

	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, spoolID)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}

// Ingest godoc
// @Summary Create or update a spool from RFID scan data (API key auth)
// @Tags rfid
// @Accept json
// @Produce json
// @Param X-API-Key header string true "API key"
// @Param body body RFIDIngestRequest true "Ingest payload"
// @Success 200 {object} models.Spool
// @Failure 400 {string} string "rfid_tag required"
// @Router /api/rfid/ingest [post]
func (h *RFIDHandler) Ingest(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		RFIDTag              string  `json:"rfid_tag"`
		WeightRemainingGrams float64 `json:"weight_remaining_grams"`
		IDFilament           string  `json:"id_filament"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RFIDTag == "" {
		http.Error(w, "rfid_tag required", http.StatusBadRequest)
		return
	}
	if req.WeightRemainingGrams <= 0 {
		req.WeightRemainingGrams = 1000
	}

	var spoolID int64
	err := h.db.QueryRow(r.Context(),
		`SELECT id_spool FROM user_filament_spool WHERE rfid_tag=$1 AND id_user=$2::uuid`,
		req.RFIDTag, uid).Scan(&spoolID)

	if err == nil {
		// Spool exists → update weight
		if _, err = h.db.Exec(r.Context(),
			`UPDATE user_filament_spool SET weight_remaining_grams=$1 WHERE id_spool=$2`,
			req.WeightRemainingGrams, spoolID); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	} else if errors.Is(err, pgx.ErrNoRows) {
		// New spool
		if req.IDFilament == "" {
			http.Error(w, "rfid_tag not found; id_filament required to create spool", http.StatusBadRequest)
			return
		}
		if err = h.db.QueryRow(r.Context(), `
			INSERT INTO user_filament_spool (id_user, id_filament, rfid_tag, weight_remaining_grams, is_dry)
			VALUES ($1::uuid, $2::uuid, $3, $4, true)
			RETURNING id_spool
		`, uid, req.IDFilament, req.RFIDTag, req.WeightRemainingGrams).Scan(&spoolID); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	} else {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	row := h.db.QueryRow(r.Context(), spoolSelectSQL+` WHERE s.id_spool=$1`, spoolID)
	s, err := scanSpool(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, s)
}
