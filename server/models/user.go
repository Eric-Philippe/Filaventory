package models

import "time"

type User struct {
	IDUser       string    `json:"id_user"`
	Email        string    `json:"email"`
	Username     string    `json:"username"`
	Currency     string    `json:"currency"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
