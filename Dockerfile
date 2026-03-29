FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm ci --prefix client \
  && npm_config_build_from_source=true npm ci --omit=dev --prefix server

COPY client ./client
COPY server ./server

RUN npm run build --prefix client

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data
ENV UPLOADS_DIR=/data/uploads

EXPOSE 8080

CMD ["node", "server/src/index.js"]
