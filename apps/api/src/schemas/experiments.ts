import { t } from 'elysia';

export const Configuration = t.Object({
  max_duration: t.Optional(t.Number({ minimum: 1, maximum: 180 })),
  max_clip_count: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
  editing_options: t.Optional(
    t.Object({
      captions: t.Optional(t.Boolean()),
      emojis: t.Optional(t.Boolean()),
      remove_silences: t.Optional(t.Boolean()),
    })
  ),
  dimensions: t.Optional(
    t.Object({
      width: t.Optional(t.Number()),
      height: t.Optional(t.Number()),
      aspectRatio: t.Optional(t.String()),
    })
  ),
});

export const CreateExperimentRequest = t.Object({
  sourceVideoUrl: t.String({ format: 'uri' }),
  name: t.String(),
  description: t.Optional(t.String()),
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
  sourceVideoUrl: t.String({ format: 'uri' }),
  sourceVideoId: t.Optional(t.String()),
  createdAt: t.String({ format: 'date-time' }),
});

export const ExperimentDetail = t.Intersect([ExperimentResponse, t.Object({ jobs: t.Array(JobInfo) })]);
