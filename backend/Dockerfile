# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

# tsc leaves the `@/*` path aliases untouched in dist/, so node can't resolve
# them at runtime. tsc-alias rewrites them to relative paths after compile.
RUN npm install --no-save tsc-alias@1.8.10 \
    && npx tsc \
    && npx tsc-alias -p tsconfig.json

RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/uploads && addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app
USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
