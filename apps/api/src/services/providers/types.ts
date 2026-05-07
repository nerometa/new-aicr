// Provider-agnostic interface every AI video clipper adapter must implement.
// Domain code (routes, poller, webhook) imports only from this file.

export interface ProviderClip {
  /** Opaque clip ID from the provider — stored in clips.provider_clip_id */
  providerClipId: string;
  title: string | null;
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  /** Clip duration in seconds */
  duration: number | null;
  /** Start time in source video (seconds) */
  startTime: number | null;
  /** End time in source video (seconds) */
  endTime: number | null;
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
   * persist in the clips table. No URLs — those are ephemeral.
   */
  getClips(providerProjectId: string): Promise<ProviderClip[]>;

  /**
   * Called on demand when the frontend requests clips. Returns a map of
   * providerClipId → fresh download URL. Never stored.
   */
  getClipUrls(providerProjectId: string): Promise<Map<string, string>>;
}

// Provider-agnostic config surface. Only fields every current provider
// can meaningfully honour. Never add a field a provider would silently ignore.
export interface ClipConfig {
  /** Max clip duration in seconds. Providers map this to their range format. */
  clipDuration?: 30 | 60 | 90;
  orientation?: 'portrait' | 'landscape' | 'square';
  captions?: boolean;
  emojis?: boolean;
}
