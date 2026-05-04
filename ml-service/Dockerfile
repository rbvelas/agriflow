FROM python:3.11-slim AS base
WORKDIR /app

# Solo libgomp1 es necesario en runtime para XGBoost/OpenMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Instalar con wheels precompilados (--prefer-binary evita compilar desde fuente)
COPY ml-service/requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY ml-service/ .
RUN mkdir -p /app/model

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
