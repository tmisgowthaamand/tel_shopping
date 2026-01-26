# Use Node.js LTS (Long Term Support) image
FROM node:20-slim

# Install system dependencies for node-canvas / ffmpeg if needed
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (Render sets PORT env automatically)
EXPOSE 3000

# Start command (Note: This is overridden in render.yaml for worker)
CMD ["npm", "start"]
