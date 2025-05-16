# Job Queue System

This project implements a job queue system using BullMQ and Redis. It is designed to process jobs efficiently with support for progress updates and graceful shutdowns.

## Project Structure

```
worker-service
├── src
│   ├── config
│   │   └── config.ts          # Configuration settings for the application
│   ├── processors
│   │   └── jobProcessor.ts   # Job processing logic
│   ├── utils
│   │   └── shutdownHandler.ts # Graceful shutdown logic
│   └── index.ts              # Entry point for the BullMQ worker application
├── package.json               # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                  # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd .\apps\backend\worker-service\
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Configuration

The application uses environment variables for configuration. You can set the following variables:

- `REDIS_HOST`: The host of the Redis server (default: `localhost`).
- `REDIS_PORT`: The port of the Redis server (default: `6379`).
- `JOB_QUEUE_NAME`: The name of the job queue (default: `local-job-queue`).

## Usage

To start the worker, run the following command:

```
npm start
```

The worker will begin processing jobs from the specified queue.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.