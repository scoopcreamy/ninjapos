# Use official Alpine Linux as base image
FROM alpine:latest

# Install necessary dependencies
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget

# Set working directory
WORKDIR /app

# Download PocketBase (adjust version as needed)
# Check latest version at https://github.com/pocketbase/pocketbase/releases
ARG PB_VERSION=0.23.4
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase

# Create pb_data directory for persistent storage
RUN mkdir -p /app/pb_data

# Expose PocketBase default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start PocketBase server
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8080"]
