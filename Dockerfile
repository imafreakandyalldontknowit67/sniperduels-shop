FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Dummy env vars needed at build time for Next.js static page generation
ENV SESSION_SECRET=build-placeholder
ENV DATABASE_URL=postgres://x:x@localhost:5432/x
# NEXT_PUBLIC_ vars must be present at build time — Next.js inlines them into the JS bundle
ENV NEXT_PUBLIC_POSTHOG_KEY=phc_JNX3y0tEnskYO8rfQxV9vJXWKt2jMgZd49kx3snK71A
ENV NEXT_PUBLIC_POSTHOG_HOST=https://ph.sniperduels.shop
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Prisma CLI for runtime migrations — Next.js standalone strips dev deps,
# so we install just the CLI globally. Pinned to match @prisma/client in package.json.
RUN npm install -g prisma@7.4.1

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run pending migrations before serving — DATABASE_URL is injected by Coolify
# at runtime, so it can reach the real DB (unlike the build container).
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
