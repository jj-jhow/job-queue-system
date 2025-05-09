# Job Queue System

A distributed job queue system with asset pipeline management for 3D content processing, built with TypeScript, Node.js, and React.

## Overview

This monorepo contains a complete job queue system with specialized asset pipeline processing capabilities. It consists of multiple services that work together to provide a robust distributed job processing platform specifically designed for 3D asset management workflows.

## Repository Structure

```
job-queue-system/
├── apps/
│   ├── asset-pipeline/         # Asset pipeline scripts and models
│   ├── backend/
│   │   ├── backend-service/    # API server & socket service
│   │   ├── worker-service/     # TypeScript job worker
│   │   └── python-worker/      # Python worker for asset processing
│   └── frontend/
│       └── frontend-ui/        # Web client interface
├── docker-compose.yml          # Docker container configurations
├── lerna.json                  # Monorepo management
└── package.json                # Root package configuration
```

## Features

- **Distributed Job Processing**: Queue and process jobs across multiple worker instances.
- **Real-time Updates**: WebSocket-based job status updates.
- **Asset Pipeline**: Specialized tools for processing 3D assets:
    - Asset Import/Export
    - Model Decimation (polygon reduction)
    - Asset Tagging
    - Full Pipeline Workflows
- **Multi-worker Architecture**: TypeScript and Python workers for different processing needs.
- **Containerized Deployment**: Docker and docker-compose setup for easy deployment.

## Technology Stack

- **Backend**: Node.js, Express, BullMQ, Socket.io.
- **Frontend**: TypeScript, Vite.
- **Database**: Redis (for job queue and pub/sub).
- **Workers**: Node.js BullMQ worker, Python worker.
- **Containerization**: Docker, docker-compose.
- **Monorepo Management**: Lerna.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v8+)
- Docker and docker-compose
- Python 3.7+ (for asset pipeline scripts)

### Installation

1. Clone the repository:
     ```bash
     git clone https://github.com/jj-jhow/job-queue-system.git
     cd job-queue-system
     ```

2. Install dependencies:
     ```bash
     npm install
     ```

3. Start the services using Docker:
     ```bash
     docker-compose up --build
     ```

     Or start individual services for development:
     ```bash
     # Start all services
     npm run dev:all

     # Or start specific services
     npm run dev:backend
     npm run dev:worker
     npm run dev:frontend
     ```

## Usage

### Accessing the UI

Once the services are running, access the frontend UI at:
```
http://localhost:8080
```

### API Endpoints

- **Create Job**: `POST /jobs`
    ```json
    {
        "name": "asset-pipeline",
        "payload": {
            "scriptParams": {
                "pipeline": true,
                "import": { /* import params */ },
                "tag": { /* tag params */ },
                "decimate": { /* decimate params */ },
                "export": { /* export params */ }
            }
        }
    }
    ```

- **Get Job Status**: `GET /jobs/:jobId`

## Asset Pipeline Features

The system supports various asset operations:

- **Asset Import**: Import 3D models into your pipeline.
- **Asset Export**: Export models to various formats (FBX, OBJ, glTF, USD).
- **Decimation**: Reduce polygon count while preserving model quality.
- **Tagging**: Add metadata tags to assets for better organization.
- **Full Pipeline**: Chain multiple operations together.

## Development

### Building

```bash
# Build all packages
npm run build:all

# Clean build outputs
npm run clean:all
```

### Adding New Services

1. Create a new directory in the appropriate apps subdirectory.
2. Add the service to the `workspaces` field in the root `package.json`.
3. Add the service to `lerna.json` if needed.
4. Update `docker-compose.yml` to include the new service.

## License

MIT

## Author

Your Name

[GitHub Repository](https://github.com/yourusername/job-queue-system)