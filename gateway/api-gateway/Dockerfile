FROM node:20-alpine
WORKDIR /app

# Install root-level deps for shared/ files
COPY package.json ./
RUN npm install

# Copy shared folder
COPY shared/ ./shared/

# Install gateway deps maintaining directory structure
COPY gateway/api-gateway/package.json ./gateway/api-gateway/
WORKDIR /app/gateway/api-gateway
RUN npm install

# Copy gateway source code
COPY gateway/api-gateway/ ./

EXPOSE 3004
CMD ["node", "index.js"]