package models

import (
	"encoding/json"
	"time"
)

type Filament struct {
	IDFilament    string          `json:"id_filament"`
	Title         string          `json:"title"`
	ColorHex      string          `json:"color_hex"`
	ColorInfo     json.RawMessage `json:"color_info,omitempty" swaggertype:"object"`
	WeightGrams   int             `json:"weight_grams"`
	ImageURL      *string         `json:"image_url,omitempty"`
	MaterialType  string          `json:"material_type"`
	FilledType    *string         `json:"filled_type,omitempty"`
	Density       float64         `json:"density"`
	ProductID	  *string         `json:"product_id,omitempty"`
	NozzleTempMin *int16          `json:"nozzle_temp_min,omitempty"`
	NozzleTempMax *int16          `json:"nozzle_temp_max,omitempty"`
	BedTempMin    *int16          `json:"bed_temp_min,omitempty"`
	BedTempMax    *int16          `json:"bed_temp_max,omitempty"`
	DryTemp       *int16          `json:"dry_temp,omitempty"`
	DryTime       *int16          `json:"dry_time,omitempty"`
	IDBrand       string          `json:"id_brand"`
	IDOrigin      *string         `json:"id_origin,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	Brand         *Brand          `json:"brand,omitempty"`
}
