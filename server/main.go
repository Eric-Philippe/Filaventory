// @title Filaventory API
// @version 1.0
// @description Filament inventory management for 3D printing enthusiasts.
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer {token}" in the Authorization header
package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger"

	"filaventory/server/config"
	"filaventory/server/db"
	_ "filaventory/server/docs"
	"filaventory/server/handlers"
	authmw "filaventory/server/middleware"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Auto-migrate: safe on existing DBs
	ctx := context.Background()
	_, _ = pool.Exec(ctx, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD'`)
	_, _ = pool.Exec(ctx, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS api_key VARCHAR(64)`)
	_, _ = pool.Exec(ctx, `ALTER TABLE user_filament_spool ADD COLUMN IF NOT EXISTS rfid_tag VARCHAR(100)`)

	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	authH := handlers.NewAuthHandler(pool, cfg)
	accountH := handlers.NewAccountHandler(pool)
	brandH := handlers.NewBrandHandler(pool)
	filamentH := handlers.NewFilamentHandler(pool)
	spoolH := handlers.NewSpoolHandler(pool)
	rackH := handlers.NewRackHandler(pool)
	prefH := handlers.NewPreferenceHandler(pool)
	wishH := handlers.NewWishlistHandler(pool)
	projectH := handlers.NewProjectHandler(pool)
	tagH := handlers.NewTagHandler(pool)
	rfidH := handlers.NewRFIDHandler(pool)

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", handlers.Health)

		// Auth
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)

		// Protected
		r.Group(func(r chi.Router) {
			r.Use(authmw.Auth(cfg.JWTSecret))

			// Brands
			r.Get("/brands", brandH.List)
			r.Get("/brands/{id}", brandH.Get)
			r.Post("/brands", brandH.Create)
			r.Put("/brands/{id}", brandH.Update)
			r.Delete("/brands/{id}", brandH.Delete)

			// Filaments
			r.Get("/filaments", filamentH.List)
			r.Get("/filaments/materials", filamentH.Materials)
			r.Get("/filaments/{id}", filamentH.Get)
			r.Post("/filaments", filamentH.Create)
			r.Put("/filaments/{id}", filamentH.Update)
			r.Delete("/filaments/{id}", filamentH.Delete)

			// Spools
			r.Get("/spools", spoolH.List)
			r.Get("/spools/{id}", spoolH.Get)
			r.Post("/spools", spoolH.Create)
			r.Put("/spools/{id}", spoolH.Update)
			r.Delete("/spools/{id}", spoolH.Delete)
			r.Patch("/spools/{id}/weight", spoolH.UpdateWeight)

			// Racks
			r.Get("/racks", rackH.List)
			r.Get("/racks/{id}", rackH.Get)
			r.Post("/racks", rackH.Create)
			r.Put("/racks/{id}", rackH.Update)
			r.Delete("/racks/{id}", rackH.Delete)

			// Filament preferences
			r.Get("/preferences/{filament_id}", prefH.Get)
			r.Put("/preferences/{filament_id}", prefH.Upsert)
			r.Delete("/preferences/{filament_id}", prefH.Delete)

			// Wishlist
			r.Get("/wishlist", wishH.List)
			r.Post("/wishlist", wishH.Create)
			r.Put("/wishlist/{id}", wishH.Update)
			r.Delete("/wishlist/{id}", wishH.Delete)

			// Projects
			r.Get("/projects", projectH.List)
			r.Get("/projects/{id}", projectH.Get)
			r.Post("/projects", projectH.Create)
			r.Put("/projects/{id}", projectH.Update)
			r.Delete("/projects/{id}", projectH.Delete)
			r.Patch("/projects/reorder", projectH.Reorder)
			r.Post("/projects/{id}/filaments", projectH.AddFilament)
			r.Delete("/projects/{id}/filaments/{link_id}", projectH.RemoveFilament)

			// Tags
			r.Get("/tags", tagH.List)
			r.Post("/tags", tagH.Create)
			r.Put("/tags/{id}", tagH.Update)
			r.Delete("/tags/{id}", tagH.Delete)

			// Account
			r.Get("/account", accountH.Get)
			r.Put("/account", accountH.Update)
			r.Put("/account/password", accountH.UpdatePassword)
			r.Post("/account/api-key", accountH.GenerateAPIKey)

			// Spools rack patch
			r.Patch("/spools/{id}/rack", spoolH.UpdateRack)

			// RFID (JWT auth) — assign/unassign tag to a spool
			r.Post("/rfid/assign", rfidH.Assign)
			r.Delete("/rfid/assign", rfidH.Unassign)
		})

		// RFID (API key auth) — for IoT devices (scales, readers)
		r.Group(func(r chi.Router) {
			r.Use(authmw.APIKey(pool))
			r.Patch("/rfid/weight", rfidH.UpdateWeightByRFID)
			r.Post("/rfid/ingest", rfidH.Ingest)
		})
	})

	// Swagger UI
	r.Get("/swagger/*", httpSwagger.WrapHandler)

	log.Printf("server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
