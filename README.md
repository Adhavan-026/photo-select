# PhotoSelect: Hybrid Cloud Wedding Photo Selection SaaS

PhotoSelect is an enterprise-grade multi-tenant platform designed for professional photography studios. The architecture implements a **Hybrid Cloud** approach: original high-resolution RAW photos stay on the photographer's local machine, while lightweight metadata is synced to a cloud backend. Clients review and favorite images via a secure, watermarked preview stream served directly from the local agent using a Cloudflare Tunnel.

---

## System Architecture

The project consists of three main components:
1. **Cloud Backend**: Express.js REST API using TypeScript, Prisma ORM (PostgreSQL), Redis, and Socket.io.
2. **Cloud Frontend**: Next.js 15 (App Router, Tailwind CSS v4, Framer Motion, React Query, and Zod).
3. **Local Studio Agent**: A Dockerized local Node.js application that watches photos folders, processes assets using Sharp, and range-streams watermarked previews via Nginx and a Cloudflare Tunnel.

---

## Directory Structure

```
/
├── apps/
│   ├── cloud-backend/             # Express.js REST API (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/            # Entities, Custom errors, Repository interfaces
│   │   │   ├── application/       # Use Cases, AuthService
│   │   │   ├── infrastructure/    # Database (Prisma), Configuration
│   │   │   └── presentation/      # Router, Middlewares, Controllers
│   │   └── prisma/                # PostgreSQL schema
│   │
│   ├── cloud-frontend/            # Next.js 15 Web Application
│   │   ├── src/
│   │   │   ├── app/               # Landing, login, register, dashboards, gallery pages
│   │   │   ├── components/        # React context providers, UI styles
│   │   │   └── lib/               # Axios client config, Query clients
│   │
│   └── studio-agent/              # Dockerized Local Studio Agent
│       ├── src/
│       │   ├── database/          # SQLite caches
│       │   ├── watcher/           # Chokidar folder monitoring
│       │   ├── processor/         # Sharp image watermark generator
│       │   ├── sync/              # Sync client heartbeats and metadata push
│       │   └── index.ts           # Local Express range stream server
│       ├── docker-compose.yml     # Local environment (Node + Nginx + Redis + Cloudflared)
│       └── nginx.conf             # Nginx reverse proxy configuration
```

---

## Prerequisites

- **Node.js** v20+ (v22 recommended)
- **NPM** v10+
- **Docker & Docker Compose** (for running the local agent)
- **PostgreSQL** database (for cloud database storage)
- **Redis** server (optional, for backend queues)

---

## Setup & Boot Instructions

### 1. Monorepo Dependency Setup
From the repository root, install dependencies for all workspaces:
```bash
npm install
```

### 2. Configure & Migrate Database (Cloud Backend)
1. Navigate to `/apps/cloud-backend` and copy `.env.example` to `.env`:
   ```bash
   cd apps/cloud-backend
   cp .env.example .env
   ```
2. Configure the `DATABASE_URL` in `.env` to point to your PostgreSQL instance.
3. Run Prisma migration templates to initialize the tables:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. Start the backend REST gateway in development mode:
   ```bash
   npm run dev
   ```
   *The server runs on `http://localhost:5000`.*

### 3. Launch Next.js Frontend
1. Navigate to `/apps/cloud-frontend`:
   ```bash
   cd ../cloud-frontend
   ```
2. Run the Next.js dev server:
   ```bash
   npm run dev
   ```
   *The portal will open on `http://localhost:3000`.*

### 4. Setup & Launch Local Studio Agent (Docker Compose)
The Studio Agent runs on the photographer's computer to monitor directories, resize files, and stream them securely.
1. Navigate to `/apps/studio-agent` and configure the environment:
   ```bash
   cd ../studio-agent
   cp .env.example .env
   ```
2. Update the credentials in `.env`:
   - `STUDIO_OWNER_EMAIL` & `STUDIO_OWNER_PASSWORD`: Must match a registered owner account in your Cloud Backend database.
   - `LOCAL_PHOTOS_PATH`: The absolute path of the photos directory on your machine to monitor (e.g. `c:/Users/adhav/Pictures`).
   - `TUNNEL_TOKEN`: Obtain this token from your Cloudflare Zero Trust Dashboard to route traffic through the tunnel.
3. Spin up the container environment:
   ```bash
   docker compose up --build -d
   ```
   *The agent connects to SQLite inside the container, launches Chokidar, registers the metadata syncs with the cloud backend, and opens Nginx proxying range-streamed requests.*

---

## Image Processing & Sync Workflow

1. **Watch**: Chokidar monitors directories registered under `watched_folders`.
2. **Compress & Watermark**: When an image is added, Sharp resizes it to:
   - **Thumbnail**: 200px wide WebP
   - **Preview**: 800px wide WebP
   - **Watermarked Preview**: 1920px wide WebP with your text burned into the center.
3. **Save Cache**: Path references and computed checksum hashes are saved in the local `agent.db` SQLite database.
4. **Metadata Sync**: The agent posts the image filenames, widths, heights, checksums, and EXIF parameters to the Cloud Backend `/api/v1/sync/album/:albumId/images`. **RAW image files are never uploaded to the cloud.**
5. **Secure Range Streaming**: When a client accesses a gallery, the browser queries the image via the secure Cloudflare Tunnel (`TUNNEL_URL/stream/:imageId`). Nginx proxies the connection to the Node Agent, which reads the local watermarked preview and streams chunk slices using `206 Partial Content`.
