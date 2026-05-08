package handlers

// Request / response types used exclusively for Swagger schema generation.
// These mirror the anonymous request structs defined inline in each handler.

// RegisterRequest is the body for POST /api/auth/register.
type RegisterRequest struct {
	Email    string `json:"email"    example:"alice@example.com"`
	Username string `json:"username" example:"alice"`
	Password string `json:"password" example:"s3cr3t!"`
}

// LoginRequest is the body for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"    example:"alice@example.com"`
	Password string `json:"password" example:"s3cr3t!"`
}

// AuthResponse is returned by Register and Login.
type AuthResponse struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	User  interface{} `json:"user"`
}

// AccountUpdateRequest is the body for PUT /api/account.
type AccountUpdateRequest struct {
	Email    string `json:"email"    example:"alice@example.com"`
	Username string `json:"username" example:"alice"`
	Currency string `json:"currency" example:"EUR"`
}

// PasswordUpdateRequest is the body for PUT /api/account/password.
type PasswordUpdateRequest struct {
	CurrentPassword string `json:"current_password" example:"old_pass"`
	NewPassword     string `json:"new_password"     example:"new_pass"`
}

// BrandRequest is the body for POST/PUT /api/brands.
type BrandRequest struct {
	Name                  string   `json:"name"                    example:"Bambu Lab"`
	Website               *string  `json:"website,omitempty"       example:"https://bambulab.com"`
	EmptySpoolWeightGrams *float64 `json:"empty_spool_weight_grams,omitempty" example:"250"`
}

// RackRequest is the body for POST/PUT /api/racks.
type RackRequest struct {
	Name        string  `json:"name"                  example:"Top shelf"`
	Description *string `json:"description,omitempty" example:"Left side"`
	MaxCapacity *int    `json:"max_capacity,omitempty" example:"12"`
}

// TagRequest is the body for POST/PUT /api/tags.
type TagRequest struct {
	Name  string  `json:"name"            example:"Urgent"`
	Color *string `json:"color,omitempty" example:"#FF5733"`
	Icon  *string `json:"icon,omitempty"`
}

// SpoolCreateRequest is the body for POST /api/spools.
type SpoolCreateRequest struct {
	IDFilament           string  `json:"id_filament"            example:"uuid-here"`
	IsSpooled            bool    `json:"is_spooled"             example:"true"`
	IsDry                bool    `json:"is_dry"                 example:"false"`
	WeightRemainingGrams float64 `json:"weight_remaining_grams" example:"850"`
	IDRack               *int64  `json:"id_rack,omitempty"      example:"3"`
	Notes                *string `json:"notes,omitempty"        example:"opened 2024-01"`
}

// SpoolUpdateRequest is the body for PUT /api/spools/{id}.
type SpoolUpdateRequest struct {
	IsSpooled            bool    `json:"is_spooled"             example:"true"`
	IsDry                bool    `json:"is_dry"                 example:"false"`
	WeightRemainingGrams float64 `json:"weight_remaining_grams" example:"650"`
	IDRack               *int64  `json:"id_rack,omitempty"`
	Notes                *string `json:"notes,omitempty"`
}

// WeightUpdateRequest is the body for PATCH /api/spools/{id}/weight.
type WeightUpdateRequest struct {
	WeightRemainingGrams float64 `json:"weight_remaining_grams" example:"520"`
}

// RackAssignRequest is the body for PATCH /api/spools/{id}/rack.
type RackAssignRequest struct {
	IDRack *int64 `json:"id_rack" example:"2"`
}

// WishlistCreateRequest is the body for POST /api/wishlist.
type WishlistCreateRequest struct {
	IDFilament     string   `json:"id_filament"              example:"uuid-here"`
	QuantitySpools float64  `json:"quantity_spools"          example:"2"`
	DesiredPrice   *float64 `json:"desired_price,omitempty"  example:"24.99"`
	PurchaseURL    *string  `json:"purchase_url,omitempty"   example:"https://store.com/item"`
	Comment        *string  `json:"comment,omitempty"        example:"wait for sale"`
	Priority       int16    `json:"priority"                 example:"1"`
}

// WishlistUpdateRequest is the body for PUT /api/wishlist/{id}.
type WishlistUpdateRequest struct {
	QuantitySpools float64  `json:"quantity_spools"          example:"1"`
	DesiredPrice   *float64 `json:"desired_price,omitempty"`
	PurchaseURL    *string  `json:"purchase_url,omitempty"`
	Comment        *string  `json:"comment,omitempty"`
	Priority       int16    `json:"priority"                 example:"0"`
}

// ProjectCreateRequest is the body for POST /api/projects.
type ProjectCreateRequest struct {
	Title        string   `json:"title"                   example:"Benchy"`
	Priority     int16    `json:"priority"                example:"0"`
	Comment      *string  `json:"comment,omitempty"`
	TargetPerson *string  `json:"target_person,omitempty" example:"Bob"`
	ModelURL     *string  `json:"model_url,omitempty"     example:"https://makerworld.com/..."`
	TagIDs       []int64  `json:"tag_ids,omitempty"`
}

// ProjectUpdateRequest is the body for PUT /api/projects/{id}.
type ProjectUpdateRequest = ProjectCreateRequest

// ReorderRequest is the body for PATCH /api/projects/reorder.
type ReorderRequest struct {
	IDs []int64 `json:"ids"`
}

// LinkFilamentRequest is the body for POST /api/projects/{id}/filaments.
type LinkFilamentRequest struct {
	IDSpool *int64 `json:"id_spool,omitempty" example:"5"`
	IDWish  *int64 `json:"id_wish,omitempty"  example:"7"`
}

// PreferenceRequest is the body for PUT /api/preferences/{filament_id}.
type PreferenceRequest struct {
	NozzleTempOverride *int16  `json:"nozzle_temp_override,omitempty" example:"215"`
	BedTempOverride    *int16  `json:"bed_temp_override,omitempty"    example:"60"`
	IroningFlow        *int16  `json:"ironing_flow,omitempty"         example:"15"`
	IroningSpeed       *int16  `json:"ironing_speed,omitempty"        example:"30"`
	Notes              *string `json:"notes,omitempty"                example:"prints better at 220"`
}

// FilamentRequest is the body for POST/PUT /api/filaments.
type FilamentRequest struct {
	Title         string  `json:"title"                     example:"Galaxy Black PLA"`
	ColorHex      string  `json:"color_hex"                 example:"#1a1a2e"`
	WeightGrams   int     `json:"weight_grams"              example:"1000"`
	ImageURL      *string `json:"image_url,omitempty"`
	MaterialType  string  `json:"material_type"             example:"PLA"`
	FilledType    *string `json:"filled_type,omitempty"     example:"Silk"`
	Density       float64 `json:"density"                   example:"1.24"`
	NozzleTempMin *int16  `json:"nozzle_temp_min,omitempty" example:"200"`
	NozzleTempMax *int16  `json:"nozzle_temp_max,omitempty" example:"220"`
	BedTempMin    *int16  `json:"bed_temp_min,omitempty"    example:"60"`
	BedTempMax    *int16  `json:"bed_temp_max,omitempty"    example:"65"`
	DryTemp       *int16  `json:"dry_temp,omitempty"        example:"50"`
	DryTime       *int16  `json:"dry_time,omitempty"        example:"6"`
	IDBrand       string  `json:"id_brand"                  example:"uuid-here"`
}

// RFIDScanRequest is the body for POST /api/rfid/scan.
type RFIDScanRequest struct {
	Code   string `json:"code"   example:"TAG-ABC123"`
	Origin string `json:"origin" example:"tigertag"`
}

// RFIDScanResponse is the response for POST /api/rfid/scan.
type RFIDScanResponse struct {
	Code    string `json:"code"`
	Origin  string `json:"origin"`
	UserID  string `json:"user_id"`
	Status  string `json:"status"`
	Message string `json:"message"`
}
