# backend-service/Dockerfile

# ---- Base Stage ----
# Use an official Node.js runtime as a parent image (choose LTS version)
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
FROM base AS dependencies
# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# Install app dependencies
RUN npm install --omit=dev
# If you have native dependencies that need build tools:
# RUN apk add --no-cache make gcc g++ python3 && npm install --omit=dev && apk del make gcc g++ python3

# ---- Build Stage ----
FROM base AS build
WORKDIR /usr/src/app
COPY package*.json ./
# Install ALL dependencies including devDependencies needed for build
RUN npm install
# Copy the rest of the application source code
COPY . .
# Compile TypeScript source code
RUN npm run build

# ---- Release Stage ----
FROM base AS release
WORKDIR /usr/src/app
# Copy built artifacts from build stage
COPY --from=build /usr/src/app/dist ./dist
# Copy production dependencies from dependencies stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copy package.json (needed for potential runtime require calls)
COPY package.json .

# Expose port 3000
EXPOSE 3000

# Define environment variables (can be overridden by docker-compose)
ENV NODE_ENV=production
ENV PORT=3000
# REDIS_HOST and REDIS_PORT will be set by docker-compose

# Command to run the application
CMD ["node", "dist/server.js"]

