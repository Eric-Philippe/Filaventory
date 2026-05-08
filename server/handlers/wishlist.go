package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type WishlistHandler struct{ db *pgxpool.Pool }

func NewWishlistHandler(db *pgxpool.Pool) *WishlistHandler { return &WishlistHandler{db: db} }

const wishSelectSQL = `
	SELECT w.id_wish, w.id_user::text, w.id_filament::text,
	       w.quantity_spools, w.desired_price, w.purchase_url, w.comment, w.priority, w.added_at,
	       f.id_filament::text, f.title, f.color_hex, f.weight_grams, f.material_type, f.image_url,
	       b.id_brand::text, b.name
	FROM user_filament_wishlist w
	JOIN filament f ON w.id_filament = f.id_filament
	JOIN brand b ON f.id_brand = b.id_brand
`

func scanWish(row interface{ Scan(dest ...any) error }) (models.WishlistItem, error) {
	var wi models.WishlistItem
	wi.Filament = &models.Filament{Brand: &models.Brand{}}
	err := row.Scan(
		&wi.IDWish, &wi.IDUser, &wi.IDFilament,
		&wi.QuantitySpools, &wi.DesiredPrice, &wi.PurchaseURL, &wi.Comment, &wi.Priority, &wi.AddedAt,
		&wi.Filament.IDFilament, &wi.Filament.Title, &wi.Filament.ColorHex,
		&wi.Filament.WeightGrams, &wi.Filament.MaterialType, &wi.Filament.ImageURL,
		&wi.Filament.Brand.IDBrand, &wi.Filament.Brand.Name,
	)
	return wi, err
}

// List godoc
// @Summary List wishlist items
// @Tags wishlist
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.WishlistItem
// @Router /api/wishlist [get]
func (h *WishlistHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	rows, err := h.db.Query(r.Context(),
		wishSelectSQL+` WHERE w.id_user=$1::uuid ORDER BY w.priority DESC, w.added_at DESC`, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var items []models.WishlistItem
	for rows.Next() {
		wi, err := scanWish(rows)
		if err != nil {
			continue
		}
		items = append(items, wi)
	}
	if items == nil {
		items = []models.WishlistItem{}
	}
	respondJSON(w, http.StatusOK, items)
}

// Create godoc
// @Summary Add item to wishlist
// @Tags wishlist
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body WishlistCreateRequest true "Wishlist item"
// @Success 201 {object} models.WishlistItem
// @Failure 400 {string} string "id_filament is required"
// @Failure 409 {string} string "filament already in wishlist"
// @Router /api/wishlist [post]
func (h *WishlistHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		IDFilament     string   `json:"id_filament"`
		QuantitySpools float64  `json:"quantity_spools"`
		DesiredPrice   *float64 `json:"desired_price"`
		PurchaseURL    *string  `json:"purchase_url"`
		Comment        *string  `json:"comment"`
		Priority       int16    `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.IDFilament == "" {
		http.Error(w, "id_filament is required", http.StatusBadRequest)
		return
	}
	if req.QuantitySpools == 0 {
		req.QuantitySpools = 1
	}

	var wishID int64
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO user_filament_wishlist (id_user, id_filament, quantity_spools, desired_price, purchase_url, comment, priority)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		RETURNING id_wish
	`, uid, req.IDFilament, req.QuantitySpools, req.DesiredPrice, req.PurchaseURL, req.Comment, req.Priority).
		Scan(&wishID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "filament already in wishlist", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	row := h.db.QueryRow(r.Context(), wishSelectSQL+` WHERE w.id_wish=$1`, wishID)
	wi, err := scanWish(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, wi)
}

// Update godoc
// @Summary Update a wishlist item
// @Tags wishlist
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Wish ID"
// @Param body body WishlistUpdateRequest true "Updated fields"
// @Success 200 {object} models.WishlistItem
// @Failure 404 {string} string "not found"
// @Router /api/wishlist/{id} [put]
func (h *WishlistHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		QuantitySpools float64  `json:"quantity_spools"`
		DesiredPrice   *float64 `json:"desired_price"`
		PurchaseURL    *string  `json:"purchase_url"`
		Comment        *string  `json:"comment"`
		Priority       int16    `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	cmd, err := h.db.Exec(r.Context(), `
		UPDATE user_filament_wishlist
		SET quantity_spools=$1, desired_price=$2, purchase_url=$3, comment=$4, priority=$5
		WHERE id_wish=$6 AND id_user=$7::uuid
	`, req.QuantitySpools, req.DesiredPrice, req.PurchaseURL, req.Comment, req.Priority, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	row := h.db.QueryRow(r.Context(), wishSelectSQL+` WHERE w.id_wish=$1`, id)
	wi, err := scanWish(row)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, wi)
}

// Delete godoc
// @Summary Remove item from wishlist
// @Tags wishlist
// @Security BearerAuth
// @Param id path int true "Wish ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/wishlist/{id} [delete]
func (h *WishlistHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM user_filament_wishlist WHERE id_wish=$1 AND id_user=$2::uuid`, id, uid)
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
