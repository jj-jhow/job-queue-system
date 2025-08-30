FROM linuxserver/blender:latest AS builder

WORKDIR /app

# Install Blender Python dependencies
COPY requirements.txt .

RUN /blender/4.5/python/bin/python3.11 -m pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Build the addon
RUN blender --command extension build --output-dir ./build --verbose

FROM ubuntu:22.04 AS runtime

COPY --from=builder /blender /blender

RUN ln -s /blender/blender /usr/local/bin/blender
RUN apt-get update && apt-get install -y \
    libx11-6 libxrender1 libxfixes3 libxi6 libxkbcommon0 libsm6 libice6 libxext6 libgl1

WORKDIR /app/build

COPY --from=builder /app/build .

RUN blender --command extension install-file --repo user_default ./toolkit-0.1.0.zip
