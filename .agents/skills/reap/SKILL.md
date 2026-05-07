---
name: Reap
description: Use when building video automation workflows, integrating AI clipping, captions, reframing, dubbing, transcription, or social publishing into applications. Reach for this skill when agents need to process long-form videos into short clips, add styled captions, reframe for different aspect ratios, dub audio into multiple languages, or publish directly to social platforms.
metadata:
    mintlify-proj: reap
    version: "1.0"
---

# Reap Automation API Skill

## Product Summary

Reap is a REST API for automating video processing: AI clipping (extracting short clips from long videos), caption generation with styling, video reframing for different aspect ratios, AI dubbing into 80+ languages, transcription, and direct publishing to YouTube, Instagram, TikTok, LinkedIn, and X. The API runs at `https://public.reap.video/api/v1/automation/` with Bearer token authentication and webhook callbacks. Key files: API key from dashboard (Profile > Settings > API Keys), webhook configuration (Profile > Settings > Webhooks). CLI: use `npx skills add https://docs.reap.video` to install the agent skill, or `npx add-mcp https://docs.reap.video/mcp` for MCP server integration. Primary docs: https://docs.reap.video

## When to Use

Reach for this skill when:
- An agent needs to extract short clips from long-form videos (podcasts, webinars, keynotes, YouTube streams)
- Building a workflow that uploads video, creates clips, and polls or waits for completion
- Adding captions with custom styling, emojis, or keyword highlighting to videos
- Reframing video for different aspect ratios (16:9 to 9:16, 1:1, 4:5) without cropping faces
- Dubbing audio into multiple languages with lip-aware timing
- Publishing completed clips to multiple social platforms from a single API call
- Setting up real-time notifications via webhooks instead of polling
- Building batch video processing pipelines for content teams or SaaS platforms

## Quick Reference

### API Endpoints by Task

| Task | Endpoint | Method |
|------|----------|--------|
| Get upload URL | `/get-upload-url` | POST |
| Create clipping project | `/create-clips` | POST |
| Create caption project | `/create-captions` | POST |
| Create reframe project | `/create-reframe` | POST |
| Create dubbing project | `/create-dubbing` | POST |
| Create transcription | `/create-transcription` | POST |
| Check project status | `/get-project-status` | GET |
| Get project details | `/get-project-details` | GET |
| Get generated clips | `/get-project-clips` | GET |
| Publish clip | `/publish-clip` | POST |
| Schedule clips | `/schedule-clips` | POST |
| Get integrations | `/get-integrations` | GET |
| Get presets | `/get-all-presets` | GET |

### Authentication Header

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Video Requirements

| Requirement | Value |
|-------------|-------|
| Format | MP4 or MOV |
| Duration | 2 minutes to 3 hours |
| File size | Max 5 GB |
| Content | Works best with dialogue-rich content |

### Project Status Values

- `queued` — waiting to process
- `processing` — currently processing
- `completed` — finished successfully
- `failed` — processing failed
- `invalid` — source video invalid
- `expired` — results no longer available

### Rate Limits

- 10 requests per minute per API key
- Creator plan: 3 concurrent projects, max 1080p
- Studio plan: 10 concurrent projects, max 4K

### Clip Duration Ranges

| Range | Duration |
|-------|----------|
| `[0, 30]` | Under 30 seconds |
| `[30, 60]` | 30–60 seconds |
| `[60, 90]` | 60–90 seconds |
| `[90, 180]` | 90 seconds–3 minutes |
| `[180, 300]` | 3–5 minutes |

## Decision Guidance

### When to Use Webhooks vs Polling

| Scenario | Use Webhooks | Use Polling |
|----------|--------------|-------------|
| Production workflows | ✓ | — |
| Real-time dashboards | ✓ | — |
| Batch processing | ✓ | — |
| Quick prototypes | — | ✓ |
| Testing/debugging | — | ✓ |
| **Why** | No wasted requests, real-time notifications, auto-disables after 5 failures | Simple, no endpoint setup needed |

**Recommendation:** Always use webhooks in production. Set up from dashboard at Profile > Settings > Webhooks. Webhook endpoint must be HTTPS, return HTTP 200 with empty body within 5–10 seconds.

### When to Use sourceUrl vs uploadId

| Approach | Use When | Example |
|----------|----------|---------|
| `uploadId` | You have a file to upload | User uploads video from your app |
| `sourceUrl` | Video is already hosted | Processing a YouTube URL directly |
| **Note** | Provide one, not both | Mutually exclusive in request |

### Clipping vs Captions vs Reframe vs Dubbing

| Task | Input | Output | Use When |
|------|-------|--------|----------|
| **Clipping** | Long video | Multiple short clips ranked by virality | Extracting highlights from podcasts, webinars, streams |
| **Captions** | Video | Video with styled captions | Adding accessibility and engagement to existing clips |
| **Reframe** | Video | Video in different aspect ratios | Adapting 16:9 content for TikTok (9:16), Instagram (1:1), etc. |
| **Dubbing** | Video | Video with dubbed audio in target language | Localizing content for international audiences |

## Workflow

### Standard Video Processing Pipeline

1. **Get upload URL** — Call `/get-upload-url` with filename to get presigned S3 URL and upload ID
2. **Upload video** — PUT your video file to the presigned URL (not via API, direct S3 upload)
3. **Create project** — POST to `/create-clips` (or `/create-captions`, `/create-reframe`, `/create-dubbing`) with uploadId and settings
4. **Monitor progress** — Either:
   - Set up webhook at dashboard (Profile > Settings > Webhooks) and wait for POST callback, OR
   - Poll `/get-project-status?projectId=...` every 5–10 seconds
5. **Retrieve results** — Once status is `completed`, call `/get-project-clips` (for clipping) or `/get-project-details` (for other types)
6. **Publish (optional)** — Call `/publish-clip` with integration IDs to post to social platforms

### Example: Create Clips from Uploaded Video

```bash
# 1. Get upload URL
curl -X POST https://public.reap.video/api/v1/automation/get-upload-url \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename":"video.mp4"}'
# Response: { "uploadUrl": "https://...", "id": "upload_abc" }

# 2. Upload video (direct to S3, not via API)
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @video.mp4

# 3. Create clipping project
curl -X POST https://public.reap.video/api/v1/automation/create-clips \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "upload_abc",
    "genre": "talking",
    "exportResolution": 1080,
    "exportOrientation": "portrait",
    "reframeClips": true,
    "captionsPreset": "system_beasty",
    "enableEmojis": true,
    "clipDurations": [[30,60],[60,90]]
  }'
# Response: { "id": "proj_xyz", "status": "processing" }

# 4. Poll for completion (or use webhooks)
curl -X GET "https://public.reap.video/api/v1/automation/get-project-status?projectId=proj_xyz" \
  -H "Authorization: Bearer $API_KEY"

# 5. Get clips once completed
curl -X GET "https://public.reap.video/api/v1/automation/get-project-clips?projectId=proj_xyz" \
  -H "Authorization: Bearer $API_KEY"
```

## Common Gotchas

- **API key in environment variables** — Never hardcode API keys. Store in `REAP_API_KEY` or similar and load from environment.
- **Upload URL is presigned S3, not API endpoint** — After calling `/get-upload-url`, upload directly to the returned URL with a PUT request, not to the Reap API.
- **Provide uploadId OR sourceUrl, not both** — Requests with both fields will fail with 400 Bad Request.
- **Webhook validation requires HTTPS** — Localhost, HTTP, and private IPs are rejected. Use a public HTTPS endpoint.
- **Webhook returns 200 with empty body** — Any other status or response body counts as failure. Return immediately, process asynchronously.
- **Webhooks auto-disable after 5 failures** — Monitor delivery history in dashboard. Re-enable by toggling the webhook on (triggers test request).
- **No automatic retries for webhooks** — If a webhook fails, Reap logs it and moves on. Use polling as fallback for critical workflows.
- **Rate limit is 10 requests/minute** — Check `X-RateLimit-Remaining` header. Exceeding limit returns 429.
- **Concurrent project limits by plan** — Creator: 3, Studio: 10. Exceeding returns 429 with "concurrent projects" message.
- **Video must be 2–3 hours** — Videos shorter than 2 minutes or longer than 3 hours fail validation at project creation.
- **Captions preset must exist** — Use `/get-all-presets` to list available presets. Invalid preset ID returns 400.
- **Integration IDs required for publishing** — Call `/get-integrations` to get IDs of connected social accounts. Invalid ID returns 400.
- **Clip URLs are presigned and expire** — Download clips immediately after completion; presigned URLs have limited lifetime.
- **Topics are optional but improve results** — Passing `topics: ["product demo", "pricing"]` steers AI toward specific segments.
- **Genre affects AI analysis** — Use `"talking"` for podcasts/interviews, `"music"` for music videos, etc. Affects clip selection.

## Verification Checklist

Before submitting work with Reap API integrations:

- [ ] API key is stored in environment variable, not hardcoded
- [ ] All requests include `Authorization: Bearer` header with valid key
- [ ] Video file is MP4 or MOV, between 2 minutes and 3 hours
- [ ] Upload URL is used for direct S3 PUT, not API POST
- [ ] Project creation includes either `uploadId` or `sourceUrl`, not both
- [ ] Webhook endpoint is HTTPS and returns HTTP 200 with empty body within 5 seconds
- [ ] Webhook URL is not localhost, 127.0.0.1, or private IP
- [ ] Polling loop checks for `completed` or `failed` status, not intermediate states
- [ ] Polling interval is 5–10 seconds (not too aggressive)
- [ ] Caption preset ID is valid (checked against `/get-all-presets`)
- [ ] Integration IDs for publishing are valid (checked against `/get-integrations`)
- [ ] Error handling catches 400 (bad request), 401 (auth), 404 (not found), 429 (rate limit)
- [ ] Concurrent project count does not exceed plan limit
- [ ] Webhook delivery history is monitored to catch auto-disable before it happens

## Resources

**Full documentation index:** https://docs.reap.video/llms.txt — comprehensive page-by-page navigation for agents

**Critical pages:**
- [Quickstart Guide](https://docs.reap.video/api-reference/3_quickstart) — upload, create clips, poll, retrieve results in 5 minutes
- [Create Clips Endpoint](https://docs.reap.video/api-reference/create-clips) — AI clipping with genre, topics, durations, reframing, captions
- [Webhooks Guide](https://docs.reap.video/api-reference/webhooks) — set up real-time notifications, endpoint requirements, auto-disable behavior

---

> For additional documentation and navigation, see: https://docs.reap.video/llms.txt