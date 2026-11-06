# syntax=docker/dockerfile:1.7
# Obraz aplikacji SDS: Next.js (standalone) + Prisma CLI (migracje) + seed.
# Jeden obraz obsługuje: serwer (domyślnie), migracje (initContainer) i seed (Job).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npx next build \
 && npm run build:seed
# Prisma CLI (migrate deploy) w osobnym katalogu, w wersji zgodnej z projektem
RUN npm install --prefix /opt/prisma --no-audit --no-fund --omit=dev \
      "prisma@$(node -p "require('prisma/package.json').version")"

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl tini \
 && addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    HOME=/tmp

# Serwer Next.js (standalone zawiera już @prisma/client i silnik zapytań)
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# Migracje i seed
COPY --from=build --chown=app:app /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=app:app /app/prisma/migrations ./prisma/migrations
COPY --from=build --chown=app:app /app/dist/seed.cjs ./dist/seed.cjs
COPY --from=build --chown=app:app /opt/prisma /opt/prisma
COPY --chown=app:app deploy/docker/migrate.sh /usr/local/bin/migrate

USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
