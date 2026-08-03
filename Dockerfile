# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY package*.json ./

RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/database ./database
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", "dist/server.js"]