# AICR — AI Content Repurposer

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Push database schema (requires Turso credentials)
cd apps/api && bunx drizzle-kit push

# Run development
cd ../.. && bun run dev
```

- **API:** http://localhost:3000
- **Web:** http://localhost:5173
- **API Docs:** http://localhost:3000/docs

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Turso libsql URL | Yes |
| `DATABASE_AUTH_TOKEN` | Turso auth token | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Yes |
| `KLAP_API_KEY` | Klap API key | Yes |
| `KLAP_API_URL` | Klap API base URL | No (default: `https://api.klap.video/v2`) |
| `BETTER_AUTH_SECRET` | Auth secret (32+ chars) | Yes |
| `BETTER_AUTH_URL` | Backend public URL (e.g., `https://api.aicr.example.com`) | Yes |
| `CORS_ORIGIN` | Frontend URL allowed to make requests (e.g., `https://aicr.example.com`) | Yes |
| `PORT` | Server port | No (default: 3000) |

### Frontend (`apps/web/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL (e.g., `https://api.aicr.example.com`) | Yes |
| `WEB_PORT` | Server port (Docker only) | No (default: 3000) |

### Quick Reference

```
CORS_ORIGIN  = URL of your frontend (backend needs this for CORS)
VITE_API_URL = URL of your backend (frontend needs this to make API calls)
BETTER_AUTH_URL = Public URL of your backend (for auth callbacks)
```

All three typically point to the same pattern:
- Frontend: `https://aicr.example.com` → `CORS_ORIGIN`
- Backend: `https://api.aicr.example.com` → `VITE_API_URL` + `BETTER_AUTH_URL`

---

## Testing

```bash
# Backend tests (Bun native)
cd apps/api && bun test

# Frontend tests (Vitest)
cd apps/web && bun test

# Run all tests from root
bun run test
```

---

## Deployment

### Option 1: Docker Compose (Self-hosted)

```bash
# Build and run
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f
```

### Option 2: Railway + Netlify

#### Backend → Railway

1. Install Railway CLI: `bun add -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway init`
4. Deploy: `railway up`
5. Set environment variables in Railway dashboard

#### Frontend → Netlify

1. Install Netlify CLI: `bun add -g netlify-cli`
2. Link project: `cd apps/web && netlify init`
3. Set `VITE_API_URL` in Netlify environment settings
4. Deploy: `netlify deploy --prod`

---

## Architecture

```
User pastes YouTube URL
  → Backend creates Klap task (POST /api/jobs)
  → Job saved in Turso + task_id pushed to Redis queue
  → Poller worker polls Klap every 30s
  → On complete: projects saved to Turso, user notified via SSE
  → Frontend renders clip cards with klap.app/player/{id} iframes
  → User clicks Export → backend POST /api/exports → polls → returns src_url
```

---

## Tech Stack

- **Runtime:** Bun
- **Backend:** Elysia.js
- **Frontend:** SvelteKit + Tailwind CSS v4
- **Database:** Turso (libsql)
- **Queue:** Upstash Redis
- **Auth:** Better Auth
- **API:** Klap (video-to-shorts)

---

## Scripts

```bash
bun run dev          # Start all apps in dev mode
bun run build        # Build all apps
bun run test         # Run all tests
bun run check-types  # Type check all apps
```

---

*Built with ☕ and too many tabs open. Ship it.*
