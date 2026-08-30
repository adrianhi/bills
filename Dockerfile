# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# 1. Install dependencies for all workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/contracts/package*.json ./packages/contracts/
COPY apps/api/prisma ./apps/api/prisma/

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bills_db"
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/bills_db"

RUN npm install
RUN cd apps/api && npx prisma generate

COPY packages/contracts ./packages/contracts
RUN npm run build --workspace=@bills/contracts

# 2. Build React Web frontend (outputs to /app/public)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_APP_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_APP_URL=$VITE_APP_URL
ENV NODE_ENV=production
COPY scripts ./scripts
COPY apps/web ./apps/web
RUN npm run build --prefix apps/web

# 3. Build Backend API
COPY apps/api ./apps/api
RUN cd apps/api && npx tsc

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/contracts/package*.json ./packages/contracts/
COPY apps/api/prisma ./apps/api/prisma/

RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/public ./public
COPY --from=builder /app/public ./apps/api/public

EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]
