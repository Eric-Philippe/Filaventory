package models

import "time"

type Brand struct {
	IDBrand              string    `json:"id_brand"`
	IDOrigin             *string   `json:"id_origin,omitempty"`
	Name                 string    `json:"name"`
	Website              *string   `json:"website,omitempty"`
	EmptySpoolWeightGrams *float64 `json:"empty_spool_weight_grams,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}
