# syntax=docker/dockerfile:1

# ---- Stage 1: install production dependencies ----
# Pinned major version on the small Alpine image.
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the dependency files first, so this layer is cached
# until package.json or package-lock.json change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: runtime image ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Bring in the installed dependencies, then only the files the app needs.
# Tests, docs and dev config are left out (see .dockerignore).
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Run as the unprivileged "node" user that ships with the base image.
USER node

EXPOSE 3000

# Mark the container unhealthy if the API stops answering.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/server.js"]
