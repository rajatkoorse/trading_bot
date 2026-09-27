# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps || npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python 3.10 Production Runtime
FROM python:3.10-slim
WORKDIR /app

# Install compilation tools for numerical packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend codebase
COPY backend/ ./backend/

# Copy compiled React frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment configuration
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000

# Start unified FastAPI server with embedded React SPA
CMD ["sh", "-c", "python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
