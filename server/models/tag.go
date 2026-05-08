package models

import "time"

type Tag struct {
	IDTag     int64     `json:"id_tag"`
	IDUser    string    `json:"id_user"`
	Name      string    `json:"name"`
	Color     *string   `json:"color,omitempty"`
	Icon      *string   `json:"icon,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
