FROM node:20-alpine
WORKDIR /app

# Step 1: Install root-level deps so shared/ files can resolve packages
# (shared/config/rabbitmq.js, logger.js etc. require colors, winston, amqplib etc.)
# Node resolution walks UP from shared/ and finds /app/node_modules/ here
COPY package.json ./
RUN npm install

# Step 2: Copy shared folder — must be at /app/shared/
COPY shared/ ./shared/

# Step 3: Install service-specific deps
# Keep service at services/auth-service/ so ../../shared resolves to /app/shared/ correctly
COPY services/auth-service/package.json ./services/auth-service/
WORKDIR /app/services/auth-service
RUN npm install

# Step 4: Copy service source code
COPY services/auth-service/ ./

EXPOSE 3001
CMD ["node", "index.js"]