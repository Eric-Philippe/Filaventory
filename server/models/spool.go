package models

import "time"

type RackRef struct {
	IDRack int64  `json:"id_rack"`
	Name   string `json:"name"`
}

type Spool struct {
	IDSpool              int64     `json:"id_spool"`
	IDUser               string    `json:"id_user"`
	IDFilament           string    `json:"id_filament"`
	IsSpooled            bool      `json:"is_spooled"`
	IsDry                bool      `json:"is_dry"`
	WeightRemainingGrams float64   `json:"weight_remaining_grams"`
	RFIDTag              *string   `json:"rfid_tag,omitempty"`
	IDRack               *int64    `json:"id_rack,omitempty"`
	Notes                *string   `json:"notes,omitempty"`
	AcquiredAt           time.Time `json:"acquired_at"`
	Filament             *Filament `json:"filament,omitempty"`
	Rack                 *RackRef  `json:"rack,omitempty"`
}
