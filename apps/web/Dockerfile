# Frontend Dockerfile for static build
# Builds from monorepo root to access bun.lock

FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace root files for dependency resolution
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
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

RUN bun run build

# Runtime with Node for SvelteKit adapter-node
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/web/build ./build
COPY --from=build /app/apps/web/package.json ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "build"]
