# ── Build stage ─────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
# bcrypt is a native addon and musl/alpine has no prebuilt binary, so it must be
# compiled from source — which needs a build toolchain.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Same native-build requirement for the prod install; drop the toolchain after
# so it doesn't bloat the final image.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && npm cache clean --force \
  && apk del .build-deps
COPY --from=builder /app/dist ./dist
# uploads is a mounted volume in docker-compose; create the mountpoint
RUN mkdir -p /app/uploads
EXPOSE 3001
# Container-level healthcheck hits the Terminus /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.APP_PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main"]
