# ── base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── dev (used by docker compose) ─────────────────────────────
FROM base AS dev
COPY tsconfig.json ./
COPY src ./src
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ── build ─────────────────────────────────────────────────────
FROM base AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── production ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 4000
CMD ["node", "dist/index.js"]
