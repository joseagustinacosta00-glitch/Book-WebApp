# ── Stage 1: Build frontend ──────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.html vite.config.js ./
COPY src/ src/
RUN npm run build

# ── Stage 2: Python backend + built frontend ─────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Python deps
COPY server/requirements.txt ./requirements.txt
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server/ ./

# Copy built frontend from stage 1 (vite outputs to server/dist)
COPY --from=frontend /app/server/dist ./dist

# Railway sets PORT env var
ENV PORT=8000
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
