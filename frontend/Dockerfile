# ── Stage 1: dependencias ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

# ── Stage 2: build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_NAME=AgriFlow
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p public
RUN ./node_modules/.bin/next build

# ── Stage 3: producción ──────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

RUN mkdir -p public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]