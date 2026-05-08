package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"filaventory/server/models"
)

type AccountHandler struct{ db *pgxpool.Pool }

func NewAccountHandler(db *pgxpool.Pool) *AccountHandler { return &AccountHandler{db: db} }

// Get godoc
// @Summary Get current user account
// @Tags account
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 401 {string} string "unauthorized"
// @Router /api/account [get]
func (h *AccountHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var u models.User
	err := h.db.QueryRow(r.Context(),
		`SELECT id_user::text, email, username, COALESCE(currency, 'USD'), created_at, updated_at
		 FROM "user" WHERE id_user = $1::uuid`,
		uid,
	).Scan(&u.IDUser, &u.Email, &u.Username, &u.Currency, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, u)
}

// Update godoc
// @Summary Update account details
// @Tags account
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body AccountUpdateRequest true "Fields to update"
// @Success 200 {object} models.User
// @Failure 401 {string} string "unauthorized"
// @Failure 409 {string} string "email or username already in use"
// @Router /api/account [put]
func (h *AccountHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Currency string `json:"currency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	var u models.User
	err := h.db.QueryRow(r.Context(), `
		UPDATE "user"
		SET email    = CASE WHEN $1 != '' THEN $1 ELSE email END,
		    username = CASE WHEN $2 != '' THEN $2 ELSE username END,
		    currency = CASE WHEN $3 != '' THEN $3 ELSE COALESCE(currency, 'USD') END,
		    updated_at = NOW()
		WHERE id_user = $4::uuid
		RETURNING id_user::text, email, username, COALESCE(currency, 'USD'), created_at, updated_at`,
		req.Email, req.Username, req.Currency, uid,
	).Scan(&u.IDUser, &u.Email, &u.Username, &u.Currency, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "email or username already in use", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, u)
}

// UpdatePassword godoc
// @Summary Change password
// @Tags account
// @Accept json
// @Security BearerAuth
// @Param body body PasswordUpdateRequest true "Current and new password"
// @Success 204
// @Failure 401 {string} string "incorrect current password"
// @Router /api/account/password [put]
func (h *AccountHandler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		http.Error(w, "current_password and new_password required", http.StatusBadRequest)
		return
	}

	var hash string
	err := h.db.QueryRow(r.Context(),
		`SELECT password_hash FROM "user" WHERE id_user = $1::uuid`, uid,
	).Scan(&hash)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)); err != nil {
		http.Error(w, "incorrect current password", http.StatusUnauthorized)
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	_, err = h.db.Exec(r.Context(),
		`UPDATE "user" SET password_hash=$1, updated_at=NOW() WHERE id_user=$2::uuid`,
		string(newHash), uid,
	)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GenerateAPIKey godoc
// @Summary Generate a new API key for RFID device authentication
// @Tags account
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{api_key=string}
// @Router /api/account/api-key [post]
func (h *AccountHandler) GenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	key := hex.EncodeToString(b)

	if _, err := h.db.Exec(r.Context(),
		`UPDATE "user" SET api_key=$1, updated_at=NOW() WHERE id_user=$2::uuid`, key, uid,
	); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"api_key": key})
}
