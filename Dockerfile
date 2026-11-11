# ---------- 1. Compilar la web ----------
FROM node:24-bookworm-slim AS web-build

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---------- 2. Runtime ----------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY content/ ./content/
COPY --from=web-build /app/web/dist ./web/dist

RUN mkdir -p /data && chown -R node:node /data /app
USER node

WORKDIR /app/server
ENV PORT=3000
ENV DB_PATH=/data/lectura.db

EXPOSE 3000

CMD ["node", "src/index.js"]
