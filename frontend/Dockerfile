# syntax=docker/dockerfile:1.6
# Build context: repo root.  See ../docker-compose.yml.

# ---------- Stage 1: build static SPA ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install --include=dev

COPY frontend ./frontend
# The container talks to the backend through the nginx proxy at /api
RUN cd frontend && VITE_API_BASE_URL=/api npm run build

# ---------- Stage 2: nginx ----------
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
