# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

# Install all dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# Copy source
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy installed node_modules and built sources
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 3001

CMD ["bun", "run", "apps/api/src/index.ts"]
