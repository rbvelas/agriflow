# ── Stage 1: dependencias ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json ./
RUN npm install --legacy-peer-deps

# ── Stage 2: build (SIN Chromium — no se necesita aquí) ──────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN ./node_modules/.bin/nest build

# ── Stage 3: producción ──────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium ca-certificates ttf-freefont curl && \
    addgroup -g 1001 -S nodejs && \
    adduser  -S nestjs -u 1001

COPY --from=builder /app/dist         ./dist
COPY --from=deps    /app/node_modules  ./node_modules
COPY backend/package.json ./

RUN mkdir -p /app/reportes_pdf && chown -R nestjs:nodejs /app/reportes_pdf

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main.js"]
