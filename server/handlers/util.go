package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"filaventory/server/middleware"
)

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func userID(r *http.Request) string {
	return r.Context().Value(middleware.UserIDKey).(string)
}

func pageParams(r *http.Request) (page, perPage, offset int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ = strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 || perPage > 200 {
		perPage = 200
	}
	offset = (page - 1) * perPage
	return
}

type PagedResponse[T any] struct {
	Data    []T `json:"data"`
	Total   int `json:"total"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}
