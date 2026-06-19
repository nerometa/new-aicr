# AGENTS.md — AICR Project Context

## Project
YouTube → short clips via AI providers (Reap, Reka Vision). SvelteKit frontend + Elysia.js backend.

## Structure
```
apps/api/          # Elysia.js backend (port 3000)
apps/web/          # SvelteKit frontend (port 3001 → container 3000)
packages/shared/   # Shared TypeScript types (Job, Clip, ClipResponse, SSEResponse)
```

## Tech Stack
- **Runtime:** Bun
- **Backend:** Elysia.js + Better Auth + Drizzle ORM
- **Frontend:** SvelteKit + Tailwind CSS v4
- **DB:** Turso (libsql)
- **Queue:** Upstash Redis
- **Testing:** Bun native test runner

## Commands
```bash
bun install                                    # monorepo deps
bun run dev                                    # both servers
bun test --testPathPattern apps/api            # API tests only
bun test --testPathPattern apps/web            # web tests only
docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### API (`apps/api/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | Turso libsql URL |
| `DATABASE_AUTH_TOKEN` | Turso auth token |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token |
| `REAP_API_KEY` | Reap AI clipping key |
| `REKA_API_KEY` | Reka Vision key |
| `BETTER_AUTH_SECRET` | ≥32 char secret |
| `BETTER_AUTH_URL` | Public URL of this API |
| `CORS_ORIGIN` | Frontend URL |
| `OWNER_USER_ID` | User ID with access to `/experiments` |
| `PORT` | Default: 3000 |

### Web (`apps/web/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (baked in at build time) |

## API Routes
```
GET  /api/health
ALL  /api/auth/*         Better Auth handler
POST /api/jobs           Create job (rate-limit: 10/hour/IP)
GET  /api/jobs           List jobs (current user)
GET  /api/jobs/:id       Job detail
GET  /api/jobs/sse/:id   SSE job status stream
GET  /api/clips/:jobId   Clips for a job (with live URLs)
POST /api/webhooks/reap  Reap completion webhook
GET  /api/experiments    List experiments (owner only)
POST /api/experiments    Create experiment (owner only)
GET  /api/experiments/:id
DELETE /api/experiments/:id
```
Swagger UI: `GET /docs` (dev only).

## Key Files
```
apps/api/src/
  index.ts                    Entry point, mounts all routes + starts poller
  env.ts                      Zod-validated env (fails fast at boot)
  db/schema.ts                Drizzle schema: user, session, account, verification, jobs, clips, experiments
  lib/auth.ts                 Better Auth instance
  lib/redis.ts                Upstash Redis client
  services/providers/
    types.ts                  ClipProvider interface + ProviderClip + ClipConfig
    reap.ts                   Reap adapter
    reka.ts                   Reka Vision adapter
    index.ts                  Provider registry (getProvider, PROVIDER_NAMES)
  services/poller.ts          Redis-backed 30s poll loop + enqueueJob
  services/completion.ts      completeJob / failJob — persists clips, updates status
  services/clip-resolver.ts   Resolves live clip URLs on demand
  routes/jobs.ts              Job CRUD + SSE
  routes/clips.ts             Clip fetch (triggers live URL resolution)
  routes/webhooks.ts          Reap webhook handler
  routes/experiments.ts       Experiments CRUD (owner only)
  middleware/requireOwner.ts  Guards experiment routes

apps/web/src/lib/
  api.ts                      API client (API_BASE constant, not function)
  auth-client.ts              Better Auth browser client

packages/shared/src/index.ts  Job, Clip, ClipResponse, JobResponse, SSEResponse types
```

## Architecture Decisions

### Provider interface
All adapters implement `ClipProvider` from `services/providers/types.ts`. Domain code never imports adapter-specific types directly.
```typescript
interface ClipProvider {
  createProject(sourceUrl: string, config?: ClipConfig): Promise<string>;  // → providerProjectId
  getProjectStatus(providerProjectId: string): Promise<'processing' | 'completed' | 'failed'>;
  getClips(providerProjectId: string): Promise<ProviderClip[]>;            // called once at completion
  getClipUrls(providerProjectId: string): Promise<Map<string, string>>;    // called on-demand
}
```

### ClipConfig
Only fields every provider can honour. Never add silently-ignored fields.
```typescript
interface ClipConfig {
  clipDuration?: 30 | 60 | 90;
  orientation?: 'portrait' | 'landscape' | 'square';
  captions?: boolean;
}
```
`emojis` is Reap-internal only — lives in Reap's `DEFAULT_CLIP_CONFIG`, not here.

### URL storage
- **Reap:** clip URLs ephemeral — never stored. Fetched live per `getClipUrls` call.
- **Reka:** clip URLs stable — stored in `clips.clip_url` at completion. `getClipUrls` re-fetches `GET /v1/clips/{id}` on demand.

### Virality scores
Normalized to 0–100 by each adapter before persistence. Reap raw (0–10) × 10. Reka `ai_score` (0–100) as-is.

### API client (frontend)
`API_BASE` is a constant — `VITE_API_URL` baked in at build time.
```typescript
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

### SSE cleanup
Uses `AbortSignal` — no manual cancel handlers.
```typescript
signal?.addEventListener('abort', () => { clearInterval(intervalId); });
```

### Auth
Sessions resolved via Better Auth in routes that need them. `resolveUserId` returns null for anonymous. Anonymous jobs work — `userId` nullable.

### Experiments
Owner-only (guarded by `requireOwner` middleware, checks `OWNER_USER_ID` env against session user). `provider` field immutable after creation.

### Provider Auto-Selection

**Boot-time registration** (`services/providers/index.ts`):
- `reap` and `reka` always registered — `REAP_API_KEY` and `REKA_API_KEY` are required env vars (Zod `.min(1)`).
- `vizard` registered only if `VIZARD_API_KEY` present (optional env var).
- `ssemble` registered only if `SSEMBLE_API_KEY` present (optional env var).
- Top-level `await import()` for optional providers — dynamic, not bundled unless key exists.
- `PROVIDER_NAMES` exported as `Object.keys(PROVIDERS)` — reflects only currently-registered providers.

**Default provider** (`routes/jobs.ts` line 94):
```typescript
const providerName = body.provider ?? 'reap';
```
Jobs default to `reap` when `provider` omitted from request body. Experiments require `provider` explicitly (no default in `CreateExperimentRequest` schema).

**Frontend discovery** (`routes/providers.ts`):
- `GET /api/providers` returns `PROVIDER_NAMES` — dynamic list of available providers.
- Frontend (`HeroInput.svelte`, `ExperimentSetup.svelte`) calls `getProviders()` on mount, populates provider picker, auto-selects `providers[0]` if default `reap` not in list.

**DB defaults**:
- `jobs.provider` column: `text('provider').notNull().default('reap')`.
- `experiments.provider` column: `text('provider').notNull().default('reap')`.
- Both immutable after creation — never updated.

**Two-tier key model**:
| Provider | Env var | Zod rule | Registered when |
|---|---|---|---|
| reap | `REAP_API_KEY` | `.min(1)` required | Always |
| reka | `REKA_API_KEY` | `.min(1)` required | Always |
| vizard | `VIZARD_API_KEY` | `.optional()` | Key present at boot |
| ssemble | `SSEMBLE_API_KEY` | `.optional()` | Key present at boot |

**Validation flow** (jobs route):
1. Client sends `{ youtubeUrl, provider? }`.
2. `body.provider ?? 'reap'` resolves default.
3. `PROVIDER_NAMES.includes(providerName)` validates against boot-time registry — fast-fail 400 if unknown.
4. `getProvider(providerName)` retrieves adapter instance — throws if somehow missing.
5. `provider.createProject(url)` submits to external API.

**Validation flow** (experiments route):
1. Client sends `{ sourceVideoUrl, provider, configurations }` — `provider` required.
2. `getProvider(providerName)` called — try/catch returns 400 if unknown.
3. All jobs in experiment share same `provider` — cross-provider A/B not supported.

## Invariants
- `jobs.provider` and `experiments.provider` immutable after creation.
- All `clips.virality_score` values are 0–100.
- Reap clip URLs never in DB. Reka clip URLs always in `clips.clip_url`.
- `ClipConfig` only holds fields all current providers honour.
- `REAP_API_KEY` and `REKA_API_KEY` required at boot. `VIZARD_API_KEY` and `SSEMBLE_API_KEY` optional — providers registered only when key present.
- Reap projects expire after 60–120 days; `getClipUrls` must surface this, not silently return empty.

See `CONTEXT.md` for full domain glossary and `docs/adr/` for architecture decisions.

## Test Files
```
apps/api/src/routes/jobs.test.ts
apps/api/src/routes/experiments.test.ts
apps/api/src/services/poller.test.ts
apps/api/src/services/reap.test.ts
apps/api/e2e/experiments.test.ts
apps/web/src/lib/api.test.ts
apps/web/src/lib/components/ExperimentSetup.test.ts
apps/web/src/lib/components/ExperimentResults.test.ts
apps/web/src/lib/components/ExperimentComparison.test.ts
```

## Agent Skills

### Issue tracker
Issues as markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels
`needs-triage` → `needs-info` → `ready-for-agent` | `ready-for-human` | `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
`CONTEXT.md` at root + `docs/adr/`. See `docs/agents/domain.md`.
