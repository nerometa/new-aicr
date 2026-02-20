# Frontend Dockerfile
# Builds from monorepo root to access bun.lock
#
# Configurable via build args:
#   VITE_API_URL - Backend API URL (required, e.g., https://api.aicr.example.com)
#   WEB_PORT - Port the server listens on (default: 3000)

FROM oven/bun:1 AS base
WORKDIR /app

# Build arguments
ARG WEB_PORT=3000

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
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

WORKDIR /app/apps/web

# Build-time environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=production

# Generate .svelte-kit/tsconfig.json to avoid warning
RUN bun run prepare
RUN bun run build

# Runtime with Node for SvelteKit adapter-node
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/web/build ./build
COPY --from=build /app/apps/web/package.json ./

ARG WEB_PORT
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=${WEB_PORT}

EXPOSE ${WEB_PORT}

CMD ["node", "build"]
