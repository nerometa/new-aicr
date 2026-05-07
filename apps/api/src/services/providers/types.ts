// Provider-agnostic interface every AI video clipper adapter must implement.
// Domain code (routes, poller, webhook) imports only from this file.

export interface ProviderClip {
  /** Opaque clip ID from the provider — stored in clips.provider_clip_id */
  providerClipId: string;
  title: string | null;
  /**
   * Virality score normalized to 0–100 by each adapter.
   * Reap raw (0–10) × 10. Reka ai_score (0–100) as-is.
   */
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  /** Clip duration in seconds */
  duration: number | null;
  /** Start time in source video (seconds) */
  startTime: number | null;
  /** End time in source video (seconds) */
  endTime: number | null;
  /**
   * Stable download URL. Populated by providers that return URLs at completion (Reka).
   * Null for providers with ephemeral URLs (Reap) — those use getClipUrls instead.
   */
  clipUrl: string | null;
}

export interface ClipProvider {
  /**
   * Submit a clipping job. Returns the opaque provider project ID stored in
   * jobs.provider_project_id.
   */
  createProject(sourceUrl: string, config?: ClipConfig): Promise<string>;

  /**
   * Normalised status poll. Called by the poller every 30s and by the webhook
   * handler (for re-verification before acting on the payload).
   */
  getProjectStatus(providerProjectId: string): Promise<'processing' | 'completed' | 'failed'>;

  /**
   * Called once when a project reaches `completed`. Returns metadata to
   * persist in the clips table. clipUrl populated for providers with stable URLs.
   */
  getClips(providerProjectId: string): Promise<ProviderClip[]>;

  /**
   * Called on demand when the frontend requests clips. Returns a map of
   * providerClipId → fresh download URL.
   * Reap: live HTTP fetch (never stored).
   * Reka: re-fetches GET /v1/clips/{id} and parses output[].video_url.
   */
  getClipUrls(providerProjectId: string): Promise<Map<string, string>>;
}

// Provider-agnostic config surface. Only fields every current provider
// can meaningfully honour. Never add a field a provider would silently ignore.
// emojis is Reap-internal only — lives in Reap's DEFAULT_CLIP_CONFIG.
export interface ClipConfig {
  /** Max clip duration in seconds. Providers map this to their range format. */
  clipDuration?: 30 | 60 | 90;
  orientation?: 'portrait' | 'landscape' | 'square';
  captions?: boolean;
}
