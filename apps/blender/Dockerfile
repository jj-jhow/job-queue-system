FROM linuxserver/blender:latest AS builder

WORKDIR /app

# Install Blender Python dependencies
COPY requirements.txt .

RUN /blender/4.5/python/bin/python3.11 -m pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Build the addon
RUN blender --command extension build --output-dir ./build

FROM linuxserver/blender:latest AS runtime

WORKDIR /app

COPY --from=builder /app .

WORKDIR /app/build

COPY --from=builder /app/build .

RUN blender --command extension install-file --repo user_default ./toolkit-0.1.0.zip
