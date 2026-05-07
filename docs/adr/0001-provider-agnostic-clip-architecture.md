# ADR 0001: Provider-Agnostic AI Video Clipper Architecture

**Date:** 2026-05-07  
**Status:** Accepted

## Context

AICR originally integrated Klap as its sole AI video clipping provider. The system is being migrated to Reap, and the product vision requires being able to add further AI video clipper providers in the future without structural changes.

Klap's concepts leaked into domain tables (`klapTaskId`, `klapFolderId`, `klapManagedUserId`) and the `Configuration` schema included Klap-specific fields (`remove_silences`, `dimensions`). Adding a second provider in this state would require forking the poller, jobs route, and schema.

Additionally, Klap's "managed users + embed token" pattern for authenticated clip viewing has no equivalent in Reap (Reap returns direct `clipUrl` CDN links). Reap clip URLs are presigned/CDN-hosted and tied to a project that expires after 60–120 days.

## Decision

Introduce a `ClipProvider` interface that all adapters must implement. The active provider is resolved at boot. Domain tables and API responses contain no provider-specific fields.

### Interface

```typescript
interface ClipProvider {
  createProject(sourceUrl: string): Promise<string>;
  getProjectStatus(providerProjectId: string): Promise<'processing' | 'completed' | 'failed'>;
  getClips(providerProjectId: string): Promise<ProviderClip[]>;
  getClipUrls(providerProjectId: string): Promise<Map<string, string>>;
}
```

### Schema changes

- `jobs` table: drop `klapTaskId`, `klapFolderId`; add `providerProjectId text`
- `user` table: drop `klapManagedUserId`
- `clips` table: drop `klapFolderId`, `previewUrl`, `embedUrl`, `exportStatus`, `exportUrl`; add `providerClipId text`, `duration real`, `startTime real`, `endTime real`

### Clip URL handling

Clip URLs are **not stored**. `GET /api/clips/:jobId` returns stored metadata from the DB and fetches fresh URLs from the provider on demand via `getClipUrls`. This is honest: Reap URLs are tied to expiring projects, and storing them would return silently broken links after expiry.

### Polling + Webhooks

Both mechanisms coexist. Webhooks (Reap dashboard-configured) handle the fast path. The Redis poller runs every 30 seconds as a fallback for missed webhook deliveries (Reap has no automatic retries). The webhook handler re-fetches project status from the provider before acting — it does not trust the payload blindly.

### Configuration schema

The provider-agnostic `Configuration` for experiments contains only: `clipDuration`, `orientation`, `captions`, `emojis`. Fields dropped: `remove_silences` (no Reap equivalent), `max_clip_count` (not a real provider API parameter). Clip count is capped at 3 inside the Reap adapter after fetching results — it is not a domain-level constraint.

## Alternatives considered

**Store clip URLs with a TTL cache:** Adds complexity (cache invalidation, stale-on-expiry edge cases). The on-demand fetch is simpler and always correct.

**Keep polling only, add webhooks later:** Viable, but Reap explicitly documents no retry on failure. Shipping without webhooks means a failed delivery permanently misses a completion event until the next poll cycle (up to 30s delay, and only if the poller is running). Webhooks + poller fallback is the correct production posture.

**Provider field in `Configuration`:** Rejected. The `Configuration` schema is a contract between the user and the domain. Routing to a specific provider per-configuration would couple the experiments UI to provider selection — a concern that belongs at the system level, not the experiment level.

## Consequences

- Adding a new provider requires implementing `ClipProvider` and registering it in the provider factory. No changes to routes, poller, or schema.
- The `Configuration` schema can only grow when a new field is meaningful to all current providers. Provider-specific capabilities are expressed through adapter defaults, not the shared schema.
- Clip count cap (3) is Reap-adapter behaviour. If a future provider supports a native `maxClips` parameter, the adapter can use it; the cap remains invisible to the domain.
- Reap project expiry (60–120 days) must be surfaced gracefully to callers when `getClipUrls` fails. The clips table retains metadata indefinitely — the user can see they had clips even after expiry.
