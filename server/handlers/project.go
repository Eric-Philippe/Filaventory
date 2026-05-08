package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"filaventory/server/models"
)

type ProjectHandler struct{ db *pgxpool.Pool }

func NewProjectHandler(db *pgxpool.Pool) *ProjectHandler { return &ProjectHandler{db: db} }

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrF64(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}

type pgxRows interface {
	Next() bool
	Scan(...any) error
	Close()
}

// scanFilamentLinks scans rows of (id_project, id_link, id_spool, id_wish, spool+filament+brand fields...)
// and returns a map keyed by project ID.
func scanFilamentLinks(rows pgxRows) map[int64][]models.ProjectFilamentLink {
	result := make(map[int64][]models.ProjectFilamentLink)
	defer rows.Close()
	for rows.Next() {
		var pid int64
		var lnk models.ProjectFilamentLink
		var (
			spoolWeight    *float64
			sfID, sfTitle  *string
			sfColor, sfMat *string
			sfImg          *string
			sbName         *string
			wfID, wfTitle  *string
			wfColor, wfMat *string
			wfImg          *string
			wbName         *string
		)
		if err := rows.Scan(
			&pid, &lnk.IDLink, &lnk.IDSpool, &lnk.IDWish,
			&spoolWeight, &sfID, &sfTitle, &sfColor, &sfMat, &sfImg, &sbName,
			&wfID, &wfTitle, &wfColor, &wfMat, &wfImg, &wbName,
		); err != nil {
			continue
		}
		if lnk.IDSpool != nil {
			lnk.Spool = &models.Spool{
				IDSpool:              *lnk.IDSpool,
				WeightRemainingGrams: ptrF64(spoolWeight),
				Filament: &models.Filament{
					IDFilament:   ptrStr(sfID),
					Title:        ptrStr(sfTitle),
					ColorHex:     ptrStr(sfColor),
					MaterialType: ptrStr(sfMat),
					ImageURL:     sfImg,
					Brand:        &models.Brand{Name: ptrStr(sbName)},
				},
			}
		}
		if lnk.IDWish != nil {
			lnk.Wish = &models.WishlistItem{
				IDWish: *lnk.IDWish,
				Filament: &models.Filament{
					IDFilament:   ptrStr(wfID),
					Title:        ptrStr(wfTitle),
					ColorHex:     ptrStr(wfColor),
					MaterialType: ptrStr(wfMat),
					ImageURL:     wfImg,
					Brand:        &models.Brand{Name: ptrStr(wbName)},
				},
			}
		}
		result[pid] = append(result[pid], lnk)
	}
	return result
}

const filamentLinkSelectSQL = `
	SELECT
		pqf.id_project, pqf.id_link, pqf.id_spool, pqf.id_wish,
		s.weight_remaining_grams,
		sf.id_filament::text, sf.title, sf.color_hex, sf.material_type, sf.image_url,
		sb.name,
		wf.id_filament::text, wf.title, wf.color_hex, wf.material_type, wf.image_url,
		wb.name
	FROM print_queue_filament pqf
	LEFT JOIN user_filament_spool s ON s.id_spool = pqf.id_spool
	LEFT JOIN filament sf ON sf.id_filament = s.id_filament
	LEFT JOIN brand sb ON sb.id_brand = sf.id_brand
	LEFT JOIN user_filament_wishlist w ON w.id_wish = pqf.id_wish
	LEFT JOIN filament wf ON wf.id_filament = w.id_filament
	LEFT JOIN brand wb ON wb.id_brand = wf.id_brand
`

func (h *ProjectHandler) loadProject(r *http.Request, projectID int64) (*models.Project, error) {
	var p models.Project
	err := h.db.QueryRow(r.Context(), `
		SELECT id_project, id_user::text, title, priority, comment, target_person, model_url, created_at, updated_at
		FROM user_print_queue WHERE id_project=$1
	`, projectID).Scan(
		&p.IDProject, &p.IDUser, &p.Title, &p.Priority, &p.Comment,
		&p.TargetPerson, &p.ModelURL, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	tagRows, err := h.db.Query(r.Context(), `
		SELECT t.id_tag, t.id_user::text, t.name, t.color, t.icon, t.created_at
		FROM user_tag t
		JOIN print_queue_tag pqt ON pqt.id_tag = t.id_tag
		WHERE pqt.id_project=$1
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()
	p.Tags = []models.Tag{}
	for tagRows.Next() {
		var t models.Tag
		if err := tagRows.Scan(&t.IDTag, &t.IDUser, &t.Name, &t.Color, &t.Icon, &t.CreatedAt); err == nil {
			p.Tags = append(p.Tags, t)
		}
	}

	linkRows, err := h.db.Query(r.Context(),
		filamentLinkSelectSQL+` WHERE pqf.id_project=$1`, projectID)
	if err != nil {
		return nil, err
	}
	p.Filaments = []models.ProjectFilamentLink{}
	for _, links := range scanFilamentLinks(linkRows) {
		p.Filaments = append(p.Filaments, links...)
	}

	return &p, nil
}

// List godoc
// @Summary List projects (print queue)
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Project
// @Router /api/projects [get]
func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	rows, err := h.db.Query(r.Context(), `
		SELECT id_project, id_user::text, title, priority, comment, target_person, model_url, created_at, updated_at
		FROM user_print_queue WHERE id_user=$1::uuid ORDER BY priority ASC, created_at ASC
	`, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var projects []models.Project
	var ids []int64
	for rows.Next() {
		var p models.Project
		p.Tags = []models.Tag{}
		p.Filaments = []models.ProjectFilamentLink{}
		if err := rows.Scan(&p.IDProject, &p.IDUser, &p.Title, &p.Priority, &p.Comment,
			&p.TargetPerson, &p.ModelURL, &p.CreatedAt, &p.UpdatedAt); err != nil {
			continue
		}
		projects = append(projects, p)
		ids = append(ids, p.IDProject)
	}
	if projects == nil {
		projects = []models.Project{}
		respondJSON(w, http.StatusOK, projects)
		return
	}

	tagRows, err := h.db.Query(r.Context(), `
		SELECT pqt.id_project, t.id_tag, t.id_user::text, t.name, t.color, t.icon, t.created_at
		FROM print_queue_tag pqt
		JOIN user_tag t ON t.id_tag = pqt.id_tag
		WHERE pqt.id_project = ANY($1)
	`, ids)
	if err == nil {
		defer tagRows.Close()
		tagMap := make(map[int64][]models.Tag)
		for tagRows.Next() {
			var pid int64
			var t models.Tag
			if err := tagRows.Scan(&pid, &t.IDTag, &t.IDUser, &t.Name, &t.Color, &t.Icon, &t.CreatedAt); err == nil {
				tagMap[pid] = append(tagMap[pid], t)
			}
		}
		for i := range projects {
			if tags, ok := tagMap[projects[i].IDProject]; ok {
				projects[i].Tags = tags
			}
		}
	}

	filRows, err := h.db.Query(r.Context(),
		filamentLinkSelectSQL+` WHERE pqf.id_project = ANY($1)`, ids)
	if err == nil {
		filMap := scanFilamentLinks(filRows)
		for i := range projects {
			if links, ok := filMap[projects[i].IDProject]; ok {
				projects[i].Filaments = links
			}
		}
	}

	respondJSON(w, http.StatusOK, projects)
}

// Get godoc
// @Summary Get a project
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Success 200 {object} models.Project
// @Failure 404 {string} string "not found"
// @Router /api/projects/{id} [get]
func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var pid int64
	if err := h.db.QueryRow(r.Context(),
		`SELECT id_project FROM user_print_queue WHERE id_project=$1 AND id_user=$2::uuid`,
		id, uid).Scan(&pid); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	p, err := h.loadProject(r, pid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, p)
}

// Create godoc
// @Summary Create a project
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body ProjectCreateRequest true "Project data"
// @Success 201 {object} models.Project
// @Failure 400 {string} string "title is required"
// @Router /api/projects [post]
func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		Title        string   `json:"title"`
		Comment      *string  `json:"comment"`
		TargetPerson *string  `json:"target_person"`
		ModelURL     *string  `json:"model_url"`
		TagIDs       []int64  `json:"tag_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var pid int64
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO user_print_queue (id_user, title, comment, target_person, model_url)
		VALUES ($1::uuid, $2, $3, $4, $5) RETURNING id_project
	`, uid, req.Title, req.Comment, req.TargetPerson, req.ModelURL).Scan(&pid); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	for _, tagID := range req.TagIDs {
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO print_queue_tag (id_project, id_tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			pid, tagID); err != nil {
			http.Error(w, "invalid tag", http.StatusBadRequest)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	p, err := h.loadProject(r, pid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, p)
}

// Update godoc
// @Summary Update a project
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param body body ProjectUpdateRequest true "Project data"
// @Success 200 {object} models.Project
// @Failure 404 {string} string "not found"
// @Router /api/projects/{id} [put]
func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	var req struct {
		Title        string  `json:"title"`
		Comment      *string `json:"comment"`
		TargetPerson *string `json:"target_person"`
		ModelURL     *string `json:"model_url"`
		TagIDs       []int64 `json:"tag_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	cmd, err := tx.Exec(r.Context(), `
		UPDATE user_print_queue SET title=$1, comment=$2, target_person=$3, model_url=$4, updated_at=NOW()
		WHERE id_project=$5 AND id_user=$6::uuid
	`, req.Title, req.Comment, req.TargetPerson, req.ModelURL, id, uid)
	if err != nil || cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if _, err := tx.Exec(r.Context(), `DELETE FROM print_queue_tag WHERE id_project=$1`, id); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	for _, tagID := range req.TagIDs {
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO print_queue_tag (id_project, id_tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, tagID); err != nil {
			http.Error(w, "invalid tag", http.StatusBadRequest)
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	p, err := h.loadProject(r, func() int64 {
		var pid int64
		_ = h.db.QueryRow(r.Context(), `SELECT id_project FROM user_print_queue WHERE id_project=$1`, id).Scan(&pid)
		return pid
	}())
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, p)
}

// Delete godoc
// @Summary Delete a project
// @Tags projects
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/projects/{id} [delete]
func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM user_print_queue WHERE id_project=$1 AND id_user=$2::uuid`, id, uid)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Reorder godoc
// @Summary Reorder projects by priority
// @Tags projects
// @Accept json
// @Security BearerAuth
// @Param body body ReorderRequest true "Ordered project IDs"
// @Success 204
// @Router /api/projects/reorder [patch]
func (h *ProjectHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for i, id := range req.IDs {
		if _, err := tx.Exec(r.Context(),
			`UPDATE user_print_queue SET priority=$1 WHERE id_project=$2 AND id_user=$3::uuid`,
			i, id, uid); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AddFilament godoc
// @Summary Link a spool or wishlist item to a project
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param body body LinkFilamentRequest true "Spool or wish ID"
// @Success 201 {object} object{id_link=int}
// @Failure 400 {string} string "id_spool or id_wish is required"
// @Router /api/projects/{id}/filaments [post]
func (h *ProjectHandler) AddFilament(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		IDSpool *int64 `json:"id_spool"`
		IDWish  *int64 `json:"id_wish"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.IDSpool == nil && req.IDWish == nil {
		http.Error(w, "id_spool or id_wish is required", http.StatusBadRequest)
		return
	}
	var linkID int64
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO print_queue_filament (id_project, id_spool, id_wish)
		VALUES ($1, $2, $3) RETURNING id_link
	`, id, req.IDSpool, req.IDWish).Scan(&linkID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, map[string]int64{"id_link": linkID})
}

// RemoveFilament godoc
// @Summary Remove a filament link from a project
// @Tags projects
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param link_id path int true "Link ID"
// @Success 204
// @Failure 404 {string} string "not found"
// @Router /api/projects/{id}/filaments/{link_id} [delete]
func (h *ProjectHandler) RemoveFilament(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	linkID := chi.URLParam(r, "link_id")
	cmd, err := h.db.Exec(r.Context(),
		`DELETE FROM print_queue_filament WHERE id_link=$1 AND id_project=$2`, linkID, id)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if cmd.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
