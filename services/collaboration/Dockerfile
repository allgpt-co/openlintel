FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/collaboration/ services/collaboration/
RUN pnpm install --frozen-lockfile --filter @openlintel/collaboration
RUN pnpm --filter @openlintel/collaboration build
RUN pnpm --filter @openlintel/collaboration deploy --prod /release
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /release ./
USER node
EXPOSE 8009
CMD ["node", "dist/index.js"]
