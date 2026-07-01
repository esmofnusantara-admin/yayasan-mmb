# ============================================================
# Stage 1: Builder — install deps & build frontend + backend
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# better-sqlite3 is a native module — needs build tools
RUN apk add --no-cache python3 make g++

# Copy package files first (for layer caching)
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build: Vite (frontend → dist/assets) + esbuild (backend → dist/server.cjs)
RUN npm run build

# ============================================================
# Stage 2: Production — lean image with only what's needed
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# better-sqlite3 native module needs these at runtime too
RUN apk add --no-cache python3 make g++

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies (includes better-sqlite3)
RUN npm ci --omit=dev && npm cache clean --force

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/system/health || exit 1

CMD ["node", "dist/server.cjs"]
