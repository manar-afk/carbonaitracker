# Stage 1: Build the React frontend
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Prepare the Node.js server & runtime
FROM node:18-alpine
WORKDIR /app

# Copy server package details and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy built frontend client assets into /app/client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Copy backend server code
COPY server/ ./server/

# Set working directory to the server folder
WORKDIR /app/server

# Expose port and configure environment variables
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
