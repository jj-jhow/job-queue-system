# worker-service/Dockerfile

# ---- Base Stage ----
    FROM node:20-alpine AS base
    WORKDIR /usr/src/app
    
    # ---- Dependencies Stage ----
    FROM base AS dependencies
    COPY package*.json ./
    RUN npm install --omit=dev
    # RUN apk add --no-cache make gcc g++ python3 && npm install --omit=dev && apk del make gcc g++ python3
    
    # ---- Build Stage ----
    FROM base AS build
    WORKDIR /usr/src/app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build
    
    # ---- Release Stage ----
    FROM base AS release
    WORKDIR /usr/src/app
    COPY --from=build /usr/src/app/dist ./dist
    COPY --from=dependencies /usr/src/app/node_modules ./node_modules
    COPY package.json .
    
    ENV NODE_ENV=production
    # REDIS_HOST and REDIS_PORT will be set by docker-compose
    
    CMD ["node", "dist/index.js"]
    
    