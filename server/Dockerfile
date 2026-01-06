# Use Node.js 22 (Debian-based for better compatibility)
FROM node:22-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for Prisma)
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "src/server.js"]
