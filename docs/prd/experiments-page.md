# PRD: Experiments Page

## Problem Statement

The user wants a dedicated page to run experiments on Klap's configuration parameters and analyze how they affect clip quality/virality scores. Currently, there's no way to:
- Run controlled experiments with different configurations
- Compare results across multiple configuration variations
- View experimental results in a structured way

The page should be accessible only to the owner (checked via `OWNER_USER_ID` environment variable).

## Solution

Create a new `/experiments` route that allows the user to:
1. Define experiment configurations (video input + parameter variations)
2. Run experiments and collect results
3. View and compare results across different configurations
4. Export results for presentation

## User Stories

1. As the owner, I want to access the experiments page, so that I can run and manage my experiments
2. As the owner, I want to input a YouTube URL for testing, so that I can use it as the source for experiments
3. As the owner, I want to select which parameters to test (aspect ratio, duration, captions, etc.), so that I can run controlled experiments
4. As the owner, I want to specify variations for each parameter (e.g., 9:16, 1:1, 4:5 for aspect ratio), so that I can compare results
5. As the owner, I want to run all experiment variations with one click, so that I can efficiently collect data
6. As the owner, I want to see results displayed with virality scores for each variation, so that I can analyze the impact of each parameter
7. As the owner, I want to compare results side-by-side, so that I can draw conclusions about which configurations work best
8. As the owner, I want to see results displayed with virality scores for each variation, so that I can analyze the impact of each parameter
9. As the owner, I want to see aggregated statistics (average, min, max) alongside raw scores, so that my presentation has both detail and summary
10. As the owner, I want to compare results side-by-side, so that I can draw conclusions about which configurations work best
11. As the owner, I want to export experiment results as CSV, so that I can use them in my class presentation
12. As the owner, I want each experiment to be named based on its configuration, so that results are self-documenting (e.g., "ar-9-16-dur-60-caps-true")
13. As the owner, I want the experiment to continue even if some API calls fail, so that I get partial data rather than no data

## Design Decisions (from grill-me session)

| Decision | Choice |
|----------|--------|
| Owner access | By user ID - check `OWNER_USER_ID` env against session.user.id |
| Job reuse | Reuse existing jobs table (leverage status tracking, sync, Redis queue) |
| API failure handling | Continue with successes, mark failed runs with error status |
| Naming | Config-based (e.g., `ar-9-16-dur-60-caps-true`) |
| Results display | Both raw scores + aggregated summary (avg/min/max) |
| Export format | CSV |
| Multiple clips | All clips as separate data rows (better statistics) |
| Data storage | New experiments table with experiment_id on jobs table |

## Implementation Decisions

### Frontend Modules

1. **ExperimentsPage** (`/experiments/+page.svelte`)
   - Main container for the experiments UI
   - Three main sections: Setup, Running, Results
   - Owner-only access check

2. **ExperimentSetup** component
   - YouTube URL input
   - Parameter selector (checkboxes for which params to test)
   - Variation configurator per parameter
   - "Run Experiment" button

3. **ExperimentResults** component
   - Table view of all results grouped by configuration
   - Columns: Configuration, Clip #, Virality Score, Duration
   - Summary statistics per configuration (avg/min/max virality scores)
   - Export CSV button

4. **ExperimentComparison** component
   - Side-by-side comparison of different configurations
   - Visual highlighting of best performers

### Backend API

1. **POST /api/experiments** - Create and run an experiment
   - Body: youtube_url, configurations[] (array of config objects)
   - Creates experiment record in experiments table
   - Creates multiple jobs (one per configuration) with experiment_id
   - Each job is enqueued via existing `enqueueJob()` function
   - Returns experiment_id for tracking
   - Continues creating jobs even if some Klap API calls fail

2. **GET /api/experiments** - List all experiments
   - Returns list of experiments with status (pending/processing/ready/error)
   - Status derived from related jobs

3. **GET /api/experiments/:id** - Get experiment results
   - Queries jobs linked to experiment via experiment_id
   - Queries clips linked to those jobs
   - Returns all clips as rows with their scores
   - Includes aggregated stats (avg, min, max per config)
   - Returns error status for failed configurations

4. **DELETE /api/experiments/:id** - Delete experiment
   - Soft delete or cascade delete related jobs/clips (decision needed)

### Database Schema Changes

1. **experiments** table (NEW)
   - id: string (UUID, primary key)
   - user_id: string (FK to users, owner only)
   - source_video_url: string
   - source_video_id: string
   - name: string (user-defined or auto-generated)
   - status: string ('pending' | 'processing' | 'ready' | 'error' | 'partial')
   - created_at: timestamp
   - updated_at: timestamp

2. **jobs** table - Add nullable column:
   - experiment_id: string (FK to experiments, nullable)
   - When populated, indicates this job is part of an experiment

### Environment Variables

- `OWNER_USER_ID` - The user ID that has exclusive access to experiments

### Access Control

- All /api/experiments endpoints require authentication via Better Auth
- Additionally check: `session.user.id === process.env.OWNER_USER_ID`
- Return 403 if not the owner
- Frontend: redirect non-owners away from /experiments route

### Parameter Configuration UI

For each experiment parameter:
- Aspect Ratio: dropdown (9:16, 1:1, 4:5)
- Duration: slider or dropdown (30s, 60s, 90s)
- Captions: toggle (true/false)
- Emojis: toggle (true/false)
- Remove Silences: toggle (true/false)
- Max Clips: number input (1-20)

### Klap API Integration

Each experiment configuration creates a Klap task via `createVideoTask()` with:
- source_video_url: the experiment's YouTube URL
- On-behalf-of header: managed user ID (if authenticated owner)
- Configuration passed via appropriate Klap API parameters

The existing poller (`startPoller()`) will automatically pick up these jobs since they use the same queue mechanism.

## Testing Decisions

- Test external behavior only (API contracts, UI interactions)
- Test the experiment run flow: create → poll → collect results
- Mock the Klap API calls in tests
- Test access control by attempting to access with different users
- Modules to test: experiment routes, results aggregation, export functionality
- Test graceful handling of partial failures (some configs succeed, some fail)

## Out of Scope

- Real-time collaboration (only owner has access)
- Automated statistical analysis (manual export only)
- Scheduled/repeated experiments
- Integration with external presentation tools
- Adding is_owner to user table (using env-based check instead)
- Modifying existing poller logic (reuse as-is)
- Creating a separate projects table (experiments reference jobs directly)

## Further Notes

- The experiment parameters match the research findings:
  - Aspect Ratio (9:16, 1:1, 4:5)
  - Duration (30, 60, 90 seconds)
  - Captions (true/false)
  - Emojis (true/false)
  - Remove Silences (true/false)
  - Max Clips (1-20)
- Use the same auth pattern as existing routes (Better Auth session check via `auth.api.getSession()`)
- Results query from clips table through jobs table - each clip is a separate data point
- Export generates CSV with columns: config_name, clip_index, virality_score, duration
- The existing Redis queue (`aicr:polling_jobs`) handles all job polling uniformly
- Experiment status calculation:
  - `pending`: all jobs pending
  - `processing`: some jobs still processing
  - `ready`: all jobs completed successfully
  - `error`: all jobs failed
  - `partial`: mix of successes and failures

---

**PRD Created**: 2026-05-01  
**Updated**: 2026-05-02 - Reworked for AICR repo (jobs/clips architecture, no projects table)  
**Design Decisions**: Confirmed via grill-me session (7 questions)  
**Status**: Ready for implementation
