# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
  npm ci --no-audit --no-fund --fetch-retries=5
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
  npm ci --prefix client --no-audit --no-fund --fetch-retries=5

COPY tsconfig.json tsconfig.build.json app.ts server.ts ./
COPY middleware ./middleware
COPY routers ./routers
COPY utils ./utils
COPY mappings ./mappings
COPY shared ./shared
COPY client ./client
RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/build ./client/build

RUN mkdir -p /app/.cache/youtubei && chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
