# Filaventory

**Filament inventory management for 3D printing enthusiasts.**

Filaventory is a self-hosted system to track your spools, organise print projects, manage wishlists, and optionally integrate with IoT devices (RFID readers, smart scales) to keep weights up to date automatically.

It consists of two main components:

- **Server** - a Go REST API backed by PostgreSQL
- **Studio** - a cross-platform desktop client (Electron + React)

A mobile companion app (**Handy**) also exists but is a personal sandbox for learning React Native. It is not production-ready and is not covered by any support or stability guarantees.

---

## Features

**Inventory**

- Track filament spools with brand, material, colour, weight, and temperature profiles
- Organise spools into named storage racks
- Set per-filament preference overrides (temperatures, ironing settings)

**Projects & Queue**

- Drag-and-drop print queue with priority ordering
- Tag projects and link the filaments they require

**Wishlist**

- Keep a list of filaments you want to buy

**Calculator**

- Estimate filament usage and cost for a given print

**RFID / IoT integration**

- Assign RFID tags to spools
- Ingest weight updates from IoT devices via API key authentication (no user login required on the device)

**Account & Data**

- Per-user accounts with JWT authentication
- Regeneratable API keys for IoT devices
- Support for user-defined brands alongside the shared catalogue

---

## Architecture

```
┌─────────────────────┐     HTTP/REST      ┌──────────────────────┐
│   Studio (Electron) │ ─────────────────► │   Server (Go + Chi)  │
│   React + TypeScript│                    │   JWT / API Key auth  │
└─────────────────────┘                    └──────────┬───────────┘
                                                      │
┌─────────────────────┐     API Key         ┌─────────▼───────────┐
│   IoT devices       │ ─────────────────► │   PostgreSQL 16      │
│   (RFID / scales)   │                    └─────────────────────┘
└─────────────────────┘
```

---

## Self-Hosting the Server

### Prerequisites

- Docker and Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/Eric-Philippe/filaventory.git
cd filaventory
cp .env.example .env
```

Edit `.env`:

```env
POSTGRES_USER=filaventory
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=filaventory
JWT_SECRET=your_64_char_hex_secret
PORT=8080
```

Generate secrets with `openssl rand -hex 32`.

### 2. Start the stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

This starts:

- **PostgreSQL 16** - data volume persisted on the host
- **Filaventory server** - built from source, exposed on port `8080`

The database schema is initialised automatically on first run via `scripts/init.sql`.

### 3. Verify

```bash
curl http://localhost:8080/api/health
# {"status":"ok"}
```

The Swagger UI is available at `http://localhost:8080/swagger/`.

### Updating

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Studio - Desktop Client

Studio is the primary client for Filaventory. It is a desktop app built with Electron and React, available for macOS, Windows, and Linux.

### Download

Pre-built binaries are attached to each [GitHub Release](../../releases):

| Platform                      | Format                  |
| ----------------------------- | ----------------------- |
| macOS (Apple Silicon + Intel) | `.dmg` / `.zip`         |
| Windows x64                   | `.exe` (NSIS installer) |
| Linux x64                     | `.AppImage` / `.deb`    |

### First launch

On first launch Studio will ask for your server URL (e.g. `http://192.168.1.10:8080`). After that, create an account and log in. All data is stored on your self-hosted server.

### Building from source

```bash
cd studio-client
npm install
npm run dev        # development (hot-reload)
npm run build      # production build
npm run dist       # package for distribution
```

Requires Node 20+.

---

## Handy - Mobile Client (work in progress)

> **Note:** Handy is a personal sandbox for learning mobile development with React Native / Expo. It is functional enough to use, but it is not polished, not actively supported, and its API surface may lag behind the server at any time. Use at your own risk.

The mobile app targets iOS and Android via Expo and mirrors most of the Studio feature set (inventory, projects, wishlist, calculator). It connects to the same self-hosted server.

### Running locally

```bash
cd handy-client
npm install
npx expo start
```

Scan the QR code with the Expo Go app or run on a simulator.

---

## API

The server exposes a documented REST API. Once running, the full interactive reference is at:

```
http://<your-server>:8080/swagger/
```

All endpoints under `/api/` (except `/api/auth/*` and `/api/health`) require a `Bearer` JWT token. RFID/IoT endpoints also accept an `X-API-Key` header.

---

## Development

### Server

```bash
cd server
go mod download
# requires a running PostgreSQL instance (see docker-compose.yml for a dev DB)
docker compose up -d db
go run main.go
```

Regenerate Swagger docs after changing handler annotations:

```bash
go install github.com/swaggo/swag/cmd/swag@latest
swag init
```

### Local dev stack

```bash
docker compose up -d   # starts PostgreSQL only; server runs locally
```

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

[MIT](LICENSE)
