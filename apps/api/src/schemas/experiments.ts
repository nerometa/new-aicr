import { t } from 'elysia';

// Provider-agnostic experiment configuration.
// Only fields every current provider can honour — no silent no-ops.
// emojis excluded: Reap-only internal config, no Reka equivalent.
export const Configuration = t.Object({
  clipDuration: t.Optional(t.Union([t.Literal(30), t.Literal(60), t.Literal(90)])),
  orientation: t.Optional(t.Union([
    t.Literal('portrait'),
    t.Literal('landscape'),
    t.Literal('square'),
  ])),
  captions: t.Optional(t.Boolean()),
});

export const CreateExperimentRequest = t.Object({
  sourceVideoUrl: t.String({ format: 'uri' }),
  name: t.String(),
  description: t.Optional(t.String()),
  provider: t.String(),
  configurations: t.Array(Configuration),
});

const JobInfo = t.Object({
  id: t.String(),
  name: t.String(),
  status: t.String(),
});

export const ExperimentResponse = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Optional(t.String()),
  status: t.String(),
  provider: t.String(),
  sourceVideoUrl: t.String({ format: 'uri' }),
  sourceVideoId: t.Optional(t.String()),
  createdAt: t.String({ format: 'date-time' }),
});

export const ExperimentDetail = t.Intersect([
  ExperimentResponse,
  t.Object({ jobs: t.Array(JobInfo) }),
]);
