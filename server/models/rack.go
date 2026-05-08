package models

import "time"

type Rack struct {
	IDRack      int64     `json:"id_rack"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	MaxCapacity *int      `json:"max_capacity,omitempty"`
	IDUser      string    `json:"id_user"`
	CreatedAt   time.Time `json:"created_at"`
	SpoolCount  int       `json:"spool_count"`
}
