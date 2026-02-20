# AGENTS.md - AICR Project Context

## Project: AICR (AI Content Repurposer)
SvelteKit frontend + Elysia.js backend for converting YouTube videos to shorts via Klap API.

## Tech Stack
- **Runtime:** Bun
- **Backend:** Elysia.js with Better Auth
- **Frontend:** SvelteKit + Tailwind CSS v4
- **Database:** Turso (libsql) with Drizzle ORM
- **Queue:** Upstash Redis
- **Testing:** Bun native test runner (both backend and frontend)

## Ports
- Backend API: 3000
- Frontend Web: 3001 (mapped from container port 3000)

## Important Commands
```bash
bun install          # Install all dependencies
bun run dev          # Start dev servers
bun test             # Run tests (from root or apps/*)
docker compose -f docker-compose.prod.yml up -d  # Production deploy
```

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | Backend | Frontend URL (for CORS) |
| `VITE_API_URL` | Frontend | Backend URL (build-time) |
| `BETTER_AUTH_URL` | Backend | Public URL of API (for auth) |

Quick reference: `CORS_ORIGIN` = frontend URL, `VITE_API_URL` = backend URL

---

## Known Issues & Fixes

### Docker Healthcheck Fails - curl Not Found

**Symptom:**
```
Container api is unhealthy
dependency failed to start: container api is unhealthy
```

**Root Cause:**
The `oven/bun:1` Docker image doesn't include `curl`. The healthcheck command `curl -f http://localhost:3000/api/health` fails silently.

**Fix:**
Add curl installation to the Dockerfile base stage:
```dockerfile
FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

### Monorepo Docker Build - bun.lock Not Found

**Symptom:**
```
error: Can't find bun.lock
```

**Root Cause:**
`bun.lock` is at monorepo root, but Dockerfiles were building from `apps/api/` context.

**Fix:**
Build from root context (`.`) and copy ALL workspace package.json files:
```dockerfile
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared ./packages/shared
```

```yaml
# docker-compose.prod.yml
services:
  api:
    build:
      context: .  # Root, not apps/api
      dockerfile: apps/api/Dockerfile
```

---

## Architecture Decisions

### API Client Pattern
Frontend uses a single `API_BASE` constant (not a function) since `VITE_API_URL` is baked in at build time:
```typescript
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

### Klap Service
Unified request function with generic typing:
```typescript
async function klapRequest<T>(path: string, options?: RequestInit): Promise<T>
```

### SSE Cleanup
Uses standard `AbortSignal` instead of manual cancel handlers:
```typescript
signal?.addEventListener('abort', () => { clearInterval(intervalId); });
```

---

## Test Count
- Backend: 31 tests
- Frontend: 6 tests
- Total: 37 tests
