# =========================================
# Stage 1: Build Stage
# =========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm install

# Copy configuration and sources
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client & Compile TypeScript
RUN npx prisma generate
RUN npm run build

# =========================================
# Stage 2: Production Runner
# =========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL and libc compatibility for Prisma engine binaries on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package definitions and prisma schema/config
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install production dependencies and Prisma CLI for migrations
RUN npm install --omit=dev && npm install prisma@^7.8.0

# Copy compiled JavaScript and generated Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

# Create logs directory and assign permissions to non-root node user
RUN mkdir -p logs && chown -R node:node /app

USER node

EXPOSE 5000

# Deploy migrations on startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]