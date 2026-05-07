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
- Backend: 43 tests (was 31, added 12 new tests for Klap managed user flow)
- Frontend: 6 tests
- Total: 49 tests

---

## Klap Managed Users Feature

### Overview
Authenticated users can view generated clips without needing a Klap account. This is implemented via Klap's Managed Users & Embeds feature.

### Flow
1. **Job Creation**: When an authenticated user creates a job
   - Checks if user has `klapManagedUserId`
   - If not, creates managed user via `POST /users`
   - Stores `klapManagedUserId` in user record
   - Passes `X-On-Behalf-Of` header to Klap when creating tasks

2. **Task Processing**: Poller monitors Klap task status

3. **Completion**: When task completes
   - Generates access token via `POST /users/{userId}/tokens`
   - Constructs embed URL: `https://app.klap.app/embed/{projectId}#external_access_token={token}`
   - Stores embed URL in clips table

4. **API Response**: Job and clip endpoints return `embedUrl` field
   - For authenticated jobs: embed URL with token
   - For anonymous jobs: null (fallback to previewUrl)

### Database Schema Updates
```typescript
// User table
klapManagedUserId: text('klap_managed_user_id') // nullable

// Clips table
embedUrl: text('embed_url') // nullable
```

### Key Implementation Files
- `apps/api/src/services/klap.ts` - Managed user and token functions
- `apps/api/src/routes/jobs.ts` - Auth-aware job creation
- `apps/api/src/services/poller.ts` - Token generation on completion
- `apps/api/src/routes/clips.ts` - Embed URL in responses

### Security Notes
- Tokens are generated on-demand and never stored in database
- One managed user per AICR user (lazy creation on first job)
- Anonymous jobs continue to work without embed URLs
- Graceful degradation if managed user creation fails

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` at root + `docs/adr/`. See `docs/agents/domain.md`.
