package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

const (
	tigerTagBrandsURL   = "https://api.tigertag.io/api:tigertag/brand/get/all"
	tigerTagProductsURL = "https://api.tigertag.io/api:tigertag/product/get/all"
	tigerTagProductURL  = "https://api.tigertag.io/api:tigertag/product/get?uid=0&product_id=%d&lang=en"
	tigerTagNamespace   = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
)

// ---- CONFIG ----
const (
	workerCount = 20
	batchSize   = 200
)

// ---- HTTP CLIENT ----
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	},
}

var defaultDensity = map[string]float64{
	"PLA": 1.24, "PLA+": 1.24, "PETG": 1.27, "ABS": 1.04, "ASA": 1.07,
	"TPU": 1.21, "TPE": 1.20, "NYLON": 1.13, "PA": 1.13, "PC": 1.20,
	"PVA": 1.23, "HIPS": 1.03, "PP": 0.91, "CPE": 1.27,
}

func brandUUID(id int) string {
	return uuid.NewSHA1(uuid.MustParse(tigerTagNamespace),
		[]byte(fmt.Sprintf("tigertag:brand:%d", id))).String()
}

func filamentUUID(id int) string {
	return uuid.NewSHA1(uuid.MustParse(tigerTagNamespace),
		[]byte(fmt.Sprintf("tigertag:filament:%d", id))).String()
}

func normalizeColor(c string) string {
	c = strings.TrimSpace(c)
	if len(c) == 9 {
		return c[:7]
	}
	if len(c) == 7 {
		return c
	}
	return "#808080"
}

// ---- TYPES ----

type tigerBrand struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type tigerProduct struct {
	ID          int             `json:"id"`
	ProductType string          `json:"product_type"`
	Brand       string          `json:"brand"`
	Title       string          `json:"title"`
	Material    string          `json:"material"`
	SKU         string          `json:"sku"`
	Color       string          `json:"color"`
	ColorInfo   json.RawMessage `json:"color_info"`
	ImgSrc      *string         `json:"img_src"`
	Density     *float64        `json:"density"`
	NozzleMin   *int            `json:"nozzle_temp_min"`
	NozzleMax   *int            `json:"nozzle_temp_max"`
	BedMin      *int            `json:"bed_temp_min"`
	BedMax      *int            `json:"bed_temp_max"`
	DryTemp     *int            `json:"dry_temp"`
	DryTime     *int            `json:"dry_time"`
}

type tigerProductDetails struct {
	Title string `json:"title"`
	Images struct {
		MainSrc *string `json:"main_src"`
	} `json:"images"`
	Filament struct {
		Material  string          `json:"material"`
		ColorInfo json.RawMessage `json:"color_info"`
	} `json:"filament"`
	Nozzle struct {
		TempMin *int `json:"temp_min"`
		TempMax *int `json:"temp_max"`
	} `json:"nozzle"`
	Bed struct {
		TempMin *int `json:"temp_min"`
		TempMax *int `json:"temp_max"`
	} `json:"bed"`
	Dryer struct {
		Temp *int `json:"temp"`
		Time *int `json:"time"`
	} `json:"dryer"`
}

// ---- FETCH ----

func fetchBrands() ([]tigerBrand, error) {
	resp, err := httpClient.Get(tigerTagBrandsURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var brands []tigerBrand
	return brands, json.NewDecoder(resp.Body).Decode(&brands)
}

func fetchProducts() ([]tigerProduct, error) {
	body, _ := json.Marshal(map[string]any{
		"page": 0, "per_page": 10000,
	})

	resp, err := httpClient.Post(tigerTagProductsURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Items []tigerProduct `json:"items"`
	}
	return result.Items, json.NewDecoder(resp.Body).Decode(&result)
}

var detailLimiter = time.Tick(100 * time.Millisecond) // ~10 req/sec

func fetchProductDetails(id int) (*tigerProductDetails, error) {
	<-detailLimiter
	url := fmt.Sprintf(tigerTagProductURL, id)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var d tigerProductDetails
	return &d, json.NewDecoder(resp.Body).Decode(&d)
}

// ---- MAIN ----

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL required")
	}

	ctx := context.Background()

	cfg, _ := pgxpool.ParseConfig(dbURL)
	cfg.MaxConns = 25

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// ---- BRANDS ----
	log.Println("fetching brands...")
	brands, _ := fetchBrands()

	brandMap := make(map[string]string)

	for _, b := range brands {
		uid := brandUUID(b.ID)
		brandMap[b.Name] = uid

		_, _ = pool.Exec(ctx, `
			INSERT INTO brand (id_brand, name)
			VALUES ($1,$2)
			ON CONFLICT (id_brand) DO UPDATE SET name=EXCLUDED.name
		`, uid, b.Name)
	}

	log.Printf("brands done (%d)", len(brands))

	// ---- PRODUCTS ----
	log.Println("fetching products...")
	products, _ := fetchProducts()

	total := int64(len(products))
	var processed int64

	// ---- PROGRESS BAR ----
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(200 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				p := atomic.LoadInt64(&processed)
				printProgress(p, total)
			case <-done:
				printProgress(total, total)
				fmt.Println()
				return
			}
		}
	}()

	jobs := make(chan tigerProduct, len(products))
	results := make(chan []any, len(products))

	var wg sync.WaitGroup

	// ---- WORKERS ----
	for i := 0; i < workerCount; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			for p := range jobs {
				row := processProduct(p, brandMap)
				if row != nil {
					results <- row
				}
				atomic.AddInt64(&processed, 1)
			}
		}()
	}

	for _, p := range products {
		jobs <- p
	}
	close(jobs)

	go func() {
		wg.Wait()
		close(results)
	}()

	// ---- BATCH INSERT ----
	batch := &pgx.Batch{}
	count := 0

	for row := range results {
		batch.Queue(`
			INSERT INTO filament (
				id_filament, id_brand, title, color_hex, color_info,
				material_type, density, product_id,
				nozzle_temp_min, nozzle_temp_max,
				bed_temp_min, bed_temp_max,
				dry_temp, dry_time, image_url
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
			ON CONFLICT (id_filament) DO UPDATE SET
				title=EXCLUDED.title,
				color_hex=EXCLUDED.color_hex,
				color_info=EXCLUDED.color_info,
				material_type=EXCLUDED.material_type,
				density=EXCLUDED.density,
				product_id=EXCLUDED.product_id,
				nozzle_temp_min=EXCLUDED.nozzle_temp_min,
				nozzle_temp_max=EXCLUDED.nozzle_temp_max,
				bed_temp_min=EXCLUDED.bed_temp_min,
				bed_temp_max=EXCLUDED.bed_temp_max,
				dry_temp=EXCLUDED.dry_temp,
				dry_time=EXCLUDED.dry_time,
				image_url=EXCLUDED.image_url
		`, row...)

		count++

		if count%batchSize == 0 {
			flushBatch(ctx, pool, batch)
			batch = &pgx.Batch{}
		}
	}

	flushBatch(ctx, pool, batch)

	close(done)

	log.Println("sync complete")
}

// ---- PROCESS ----

func processProduct(p tigerProduct, brandMap map[string]string) []any {
	if p.ProductType != "Filament" && p.ProductType != "" {
		return nil
	}

	brandUID, ok := brandMap[p.Brand]
	if !ok {
		return nil
	}

	filUID := filamentUUID(p.ID)
	color := normalizeColor(p.Color)

	material := p.Material
	if material == "" {
		material = "PLA"
	}

	density := 1.24
	if p.Density != nil && *p.Density > 0 {
		density = *p.Density
	} else if d, ok := defaultDensity[strings.ToUpper(material)]; ok {
		density = d
	}

	title := p.Title
	if title == "" {
		title = material + " - " + p.SKU
	}

	if details, err := fetchProductDetails(p.ID); err == nil {
		if details.Filament.Material != "" {
			material = details.Filament.Material
		}
		if details.Images.MainSrc != nil {
			p.ImgSrc = details.Images.MainSrc
		}
		if details.Title != "" {
			title = details.Title
		}
		if details.Nozzle.TempMin != nil {
			p.NozzleMin = details.Nozzle.TempMin
		}
		if details.Nozzle.TempMax != nil {
			p.NozzleMax = details.Nozzle.TempMax
		}
		if details.Bed.TempMin != nil {
			p.BedMin = details.Bed.TempMin
		}
		if details.Bed.TempMax != nil {
			p.BedMax = details.Bed.TempMax
		}
		if details.Dryer.Temp != nil {
			p.DryTemp = details.Dryer.Temp
		}
		if details.Dryer.Time != nil {
			p.DryTime = details.Dryer.Time
		}
	}

	return []any{
		filUID,
		brandUID,
		title,
		color,
		p.ColorInfo,
		material,
		density,
		strconv.Itoa(p.ID),
		p.NozzleMin,
		p.NozzleMax,
		p.BedMin,
		p.BedMax,
		p.DryTemp,
		p.DryTime,
		p.ImgSrc,
	}
}

// ---- BATCH FLUSH ----

func flushBatch(ctx context.Context, pool *pgxpool.Pool, batch *pgx.Batch) {
	br := pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < batch.Len(); i++ {
		_, err := br.Exec()
		if err != nil {
			log.Printf("batch error: %v", err)
		}
	}
}

// ---- PROGRESS ----

func printProgress(current, total int64) {
	width := 40

	percent := float64(current) / float64(total)
	filled := int(percent * float64(width))

	bar := strings.Repeat("=", filled) + strings.Repeat(" ", width-filled)

	fmt.Printf("\r[%s] %3.0f%% (%d/%d)", bar, percent*100, current, total)
}