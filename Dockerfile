# Multi-stage build for Keel AI-SDLC Framework
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Stage 2: Runtime
FROM node:20-alpine

LABEL maintainer="Amar Singh <support@creativemyntra.com>"
LABEL description="Keel AI-SDLC Framework - Complete AI-powered software development lifecycle automation"
LABEL version="3.1.0"

WORKDIR /app

# Install Git (required by Keel)
RUN apk add --no-cache git bash

# Copy from builder
COPY --from=builder /build/node_modules /app/node_modules
COPY --from=builder /build .

# Create keel configuration directories
RUN mkdir -p ~/.keel/config ~/.keel/secrets && \
    chmod 700 ~/.keel/secrets

# Make setup scripts executable
RUN chmod +x scripts/init-keel-home.sh setup-integrations.sh

# Expose port for future API features
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('OK')" || exit 1

# Set entrypoint
ENTRYPOINT ["node", "./bin/keel.js"]

# Default command
CMD ["--help"]
