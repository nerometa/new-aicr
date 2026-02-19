# Backend Dockerfile for Railway
# Builds from monorepo root to access bun.lock

FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace root files for dependency resolution
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared ./packages/shared

# Install dependencies from root (workspace-aware)
RUN bun install --frozen-lockfile

# Build stage
FROM base AS release
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
