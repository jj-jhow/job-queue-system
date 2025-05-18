FROM python:3.13-slim

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REDIS_URL=redis://redis:6379/0 \
    QUEUE_KEY=jobs \
    ASSET_PIPELINE_PATH=/usr/src/app/asset-pipeline

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./src /usr/src/app/src

# Make directories for asset pipeline
RUN mkdir -p /usr/src/app/asset-pipeline/src/automation

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import redis, os; redis.from_url(os.environ.get('REDIS_URL')).ping()" || exit 1

# Command to run the worker
CMD ["python", "src/worker.py"]