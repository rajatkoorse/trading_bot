# Stage 1: Fast Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --prefer-offline --no-audit
COPY frontend/ ./
RUN npm run build

# Stage 2: Fast Python 3.10 Runtime (Using Pre-compiled Binary Wheels)
FROM python:3.10-slim
WORKDIR /app

# Install pre-built binary wheels directly (Zero C++ compilation needed, 5x faster build)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --prefer-binary -r backend/requirements.txt

# Copy backend application
COPY backend/ ./backend/

# Copy compiled React frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000

# Start FastAPI server serving both API and static React frontend
CMD ["sh", "-c", "python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
