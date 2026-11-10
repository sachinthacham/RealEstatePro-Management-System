# --- Build stage: compile TypeScript to JS ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime stage: production dependencies only ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Created at runtime by the app itself, but declared here so the
# volumes mounted by docker-compose have somewhere to land.
RUN mkdir -p uploads logs

EXPOSE 5000
CMD ["node", "dist/server.js"]
