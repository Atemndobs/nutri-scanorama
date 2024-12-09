# Build stage
FROM --platform=linux/amd64 node:20 as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Copy example env to .env
RUN cp .env.production .env

# Production stage
FROM --platform=linux/amd64 node:20

# Set working directory
WORKDIR /app

# Copy all files from builder
COPY --from=builder /app ./

# Set environment variable for Vite to bind to all interfaces
ENV VITE_HOST=0.0.0.0

# Expose both the Vite dev server and proxy server ports
EXPOSE 5173
EXPOSE 3002

# Start both servers
CMD ["npm", "start"]
