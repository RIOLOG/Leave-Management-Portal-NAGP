FROM node:20-alpine
WORKDIR /app

# Install root-level deps for shared/ files
COPY package.json ./
RUN npm install

# Copy shared folder
COPY shared/ ./shared/

# Install service deps maintaining directory structure
COPY services/leave-service/package.json ./services/leave-service/
WORKDIR /app/services/leave-service
RUN npm install

# Copy service source code
COPY services/leave-service/ ./

EXPOSE 3003
CMD ["node", "index.js"]