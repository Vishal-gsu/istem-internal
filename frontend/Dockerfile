FROM node:18-alpine

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port for Next.js
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
