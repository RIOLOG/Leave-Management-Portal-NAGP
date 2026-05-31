FROM node:20-alpine
WORKDIR /app

# Install root-level deps for shared/ files
COPY package.json ./
RUN npm install

# Copy shared folder
COPY shared/ ./shared/

# Install service deps maintaining directory structure
COPY services/employee-service/package.json ./services/employee-service/
WORKDIR /app/services/employee-service
RUN npm install

# Copy service source code
COPY services/employee-service/ ./

EXPOSE 3002
CMD ["node", "index.js"]