# Backend Dockerfile
# Builds from monorepo root to access bun.lock
#
# Configurable via build args:
#   API_PORT - Port the server listens on (default: 3000)

FROM oven/bun:1 AS base
WORKDIR /app

# Build arguments
ARG API_PORT=3000

# Copy ALL workspace package.json files for proper resolution
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
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

ARG API_PORT
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=${API_PORT}

EXPOSE ${API_PORT}

CMD ["bun", "run", "src/index.ts"]
