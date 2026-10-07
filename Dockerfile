# ---------- Estágio 1: build do frontend (React/Vite) ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Estágio 2: backend (FastAPI) + frontend compilado ----------
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist
COPY start.sh start.sh
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Banco persistente (monte um volume em /data na nuvem)
ENV DATA_DIR=/data
ENV DATABASE_URL=sqlite:////data/pcp.db
RUN mkdir -p /data

EXPOSE 8000
CMD ["./start.sh"]
