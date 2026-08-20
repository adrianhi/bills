# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# 1. Install root dependencies
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bills_db"
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/bills_db"
RUN npm install
RUN npx prisma generate

# 2. Build React frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# 3. Build backend
COPY src ./src
RUN npx tsc

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
