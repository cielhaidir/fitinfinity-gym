# syntax=docker/dockerfile:1

########################
# BASE IMAGE
########################
FROM node:18 AS base
WORKDIR /app

########################
# DEPENDENCIES LAYER
########################
FROM base AS deps

# Install dependencies only
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./
COPY prisma ./prisma

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found." && exit 1; \
  fi

########################
# BUILDER LAYER
########################
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

########################
# PRODUCTION LAYER
########################
FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
