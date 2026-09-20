FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/
COPY data/building-codes/ data/building-codes/
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_COLLAB_SERVICE_URL
ARG BUILD_SHA=unknown
ENV NEXT_PUBLIC_COLLAB_SERVICE_URL=$NEXT_PUBLIC_COLLAB_SERVICE_URL BUILD_SHA=$BUILD_SHA
RUN pnpm --filter @openlintel/web build

FROM builder AS migrate
WORKDIR /app/packages/db
RUN chown -R node:node /app/packages/db
USER node
CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA
LABEL org.opencontainers.image.revision=$BUILD_SHA
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=node:node /app/data/building-codes ./data/building-codes
COPY --chown=node:node infra/docker/web-entrypoint.mjs ./infra/web-entrypoint.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "infra/web-entrypoint.mjs"]
