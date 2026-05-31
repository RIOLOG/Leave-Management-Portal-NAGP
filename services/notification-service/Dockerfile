FROM node:20-alpine
WORKDIR /app

# Install root-level deps for shared/ files
COPY package.json ./
RUN npm install

# Copy shared folder
COPY shared/ ./shared/

# Install service deps maintaining directory structure
COPY services/notification-service/package.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm install

# Copy service source code
COPY services/notification-service/ ./

# No EXPOSE — notification service has no HTTP server
CMD ["node", "index.js"]