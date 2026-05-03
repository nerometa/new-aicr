# Stochastic Multi-Agent Consensus Report

**Problem**: Klap API's preview URL (https://klap.app/player/{projectId}) requires users to be logged into their Klap account to watch preview clips. AICR users cannot view their generated clips without having a Klap account.
**Agents**: 5
**Date**: 2026-04-29

---

## Key Discovery (from Klap Documentation)

**Klap has a built-in solution: Managed Users & Embeds**

The documentation reveals Klap supports authenticated embedding without requiring users to have Klap accounts:

1. **Create a "ghost" user** — `POST /users` creates a user with no credentials needed
2. **Create content on behalf of that user** — Use `X-On-Behalf-Of` header when creating tasks/exports
3. **Generate an access token** — `POST /users/{user_id}/tokens` returns an `external_access_token`
4. **Load embed player with token** — Use URL format: `https://app.klap.app/embed/{project_id}#external_access_token={token}`

This allows AICR to create managed users, generate content for them, and provide authenticated embed URLs—all without the end user needing a Klap account.

---

## Consensus (agreed by 5/5 agents)

### 1. Download & Self-Host Videos (5/5 agents)
**Confidence**: 8/10 average

- All agents recommended downloading and hosting videos locally as the best long-term solution
- Eliminates dependency on Klap player entirely
- Enables future features (downloads, sharing, analytics)
- Tradeoff: Storage/bandwidth costs, video processing complexity

### 2. Show Clear Error/Placeholder Message (4/5 agents)
**Confidence**: 7-9/10

- Agents ranked this as the best immediate workaround
- Low effort to implement, manages user expectations
- Doesn't solve the problem—just makes it less confusing

---

## Divergences

### OAuth vs Download approaches
- Some agents recommended OAuth integration (assuming Klap supports it)
- Others recommended downloading videos directly
- **Resolution**: The Klap docs show neither OAuth nor simple download is needed—Managed Users provides the best of both worlds

---

## Outliers

### "Make Download Primary, Preview Secondary" (1 agent)
- Recommendation to shift UX to emphasize download over preview
- Not a consensus view—other agents saw this as workaround, not solution

---

## Recommendation for AICR

**Immediate**: Use Klap's Managed Users & Embeds feature
- Create ghost users for each AICR user (or one per session)
- Generate access tokens server-side
- Embed with token: `https://app.klap.app/embed/{project_id}#external_access_token={token}`

**Long-term**: Still consider downloading and hosting videos yourself
- Full independence from Klap
- Enables offline playback, custom players, no Klap branding
- Tradeoff: Storage costs, transcoding complexity

---

## Agent Framing Variations

| Agent | Framing | Top Recommendation |
|-------|---------|-------------------|
| bg_5fb37743 | Neutral | Download & host videos locally |
| bg_24137859 | Risk-averse | Host clips yourself + clear error message |
| bg_56a1714e | User-empathy | Download and self-host video files |
| bg_18a17f58 | First-principles | Use export API + make download primary |
| bg_f2159de8 | Systems-thinker | Download and self-host + placeholder as interim |

---

## Raw Recommendations Table

| Recommendation | Count | Avg Confidence |
|----------------|-------|-----------------|
| Download & self-host videos | 5/5 | 8.0 |
| Clear error/placeholder message | 4/5 | 8.0 |
| Embed via Klap's API | 2/5 | 5.5 |
| Implement OAuth | 2/5 | 5.5 |
| Make download primary | 1/5 | 9.0 |