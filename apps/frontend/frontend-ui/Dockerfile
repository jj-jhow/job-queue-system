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
FROM nginx:alpine AS release
WORKDIR /usr/src/app
# Copy built artifacts from build stage
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

