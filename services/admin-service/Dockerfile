FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Use environment variables for DB and Cognito
ENV NODE_ENV=production
EXPOSE 8080

# Run DB migrations automatically at startup (safe for CI/CD)
CMD npx prisma migrate deploy && node src/server.js
