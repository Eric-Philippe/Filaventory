package models

import "time"

type ProjectFilamentLink struct {
	IDLink    int64         `json:"id_link"`
	IDProject int64         `json:"id_project"`
	IDSpool   *int64        `json:"id_spool,omitempty"`
	IDWish    *int64        `json:"id_wish,omitempty"`
	Spool     *Spool        `json:"spool,omitempty"`
	Wish      *WishlistItem `json:"wish,omitempty"`
}

type Project struct {
	IDProject    int64                 `json:"id_project"`
	IDUser       string                `json:"id_user"`
	Title        string                `json:"title"`
	Priority     int16                 `json:"priority"`
	Comment      *string               `json:"comment,omitempty"`
	TargetPerson *string               `json:"target_person,omitempty"`
	ModelURL     *string               `json:"model_url,omitempty"`
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
	Tags         []Tag                 `json:"tags"`
	Filaments    []ProjectFilamentLink `json:"filaments"`
}
