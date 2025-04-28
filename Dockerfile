# Stage 1: Build
FROM node:22-bullseye AS builder
WORKDIR /app

# Install build dependencies including FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies with clean cache
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy and build
COPY . .
RUN npm run register:prod

# Stage 2: Run
FROM node:22-bullseye
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser -g 1001 && \
    useradd -r -u 1001 -g appuser appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app/data

# Copy from builder
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app ./

# Security hardening
RUN find /app -type d -exec chmod 755 {} + && \
    find /app -type f -exec chmod 644 {} + && \
    chmod 755 /app/data

USER appuser
EXPOSE 3000

ENTRYPOINT ["npm", "run", "start:prod"]