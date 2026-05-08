package models

type Preference struct {
	IDUser             string   `json:"id_user"`
	IDFilament         string   `json:"id_filament"`
	NozzleTempOverride *int16   `json:"nozzle_temp_override,omitempty"`
	BedTempOverride    *int16   `json:"bed_temp_override,omitempty"`
	IroningFlow        *int16   `json:"ironing_flow,omitempty"`
	IroningSpeed       *int16   `json:"ironing_speed,omitempty"`
	Notes              *string  `json:"notes,omitempty"`
}
