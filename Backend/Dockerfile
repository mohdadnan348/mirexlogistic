# ============================================================
# MirexCargo Backend — Production Docker Image
# ============================================================

# ------------------------------------------------------------
# Stage 1 — Dependencies
# ------------------------------------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Native build dependencies required by some Node packages.
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

COPY package*.json ./

RUN npm ci


# ------------------------------------------------------------
# Stage 2 — Build
# ------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

COPY --from=dependencies /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Application source
COPY src ./src

# Compile TypeScript
RUN npm run build


# ------------------------------------------------------------
# Stage 3 — Production Runtime
# ------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Chromium dependencies for Puppeteer PDF generation.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Production dependencies only
COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

# Compiled application
COPY --from=builder /app/dist ./dist

# Runtime directories
RUN mkdir -p \
    /app/logs \
    /app/uploads \
    /app/storage \
    && chown -R node:node /app

USER node

EXPOSE 5000

# Gracefully handle SIGTERM/SIGINT.
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]