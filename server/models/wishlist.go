package models

import "time"

type WishlistItem struct {
	IDWish         int64     `json:"id_wish"`
	IDUser         string    `json:"id_user"`
	IDFilament     string    `json:"id_filament"`
	QuantitySpools float64   `json:"quantity_spools"`
	DesiredPrice   *float64  `json:"desired_price,omitempty"`
	PurchaseURL    *string   `json:"purchase_url,omitempty"`
	Comment        *string   `json:"comment,omitempty"`
	Priority       int16     `json:"priority"`
	AddedAt        time.Time `json:"added_at"`
	Filament       *Filament `json:"filament,omitempty"`
}
