# Python Worker for BullMQ Job Queue

This Python worker connects to the same Redis queue used by the Node.js BullMQ worker and processes jobs.

## Setup

1. Create a Python virtual environment:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Make sure Redis is running and accessible.

## Running the Worker

```bash
python src/worker.py
```

### Command Line Arguments

- `--host`: Redis host (default: localhost)
- `--port`: Redis port (default: 6379)
- `--queue`: BullMQ queue name (default: jobQueueBullMQ)

Example:
```bash
python src/worker.py --host redis-server --port 6379
```

## Environment Variables

You can also configure the worker using environment variables:

- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `JOB_QUEUE_NAME`: BullMQ queue name (default: jobQueueBullMQ)
- `LOG_LEVEL`: Logging level (default: INFO)

## Notes

This worker uses a simplified approach to interact with BullMQ. In a production environment, you might want to implement the full BullMQ protocol or use a Python library that's compatible with BullMQ.