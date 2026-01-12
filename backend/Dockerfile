# Stage 1: Install dependencies
FROM node:18 AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

# Stage 2: Final image
FROM node:18-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

CMD ["npm", "start"]