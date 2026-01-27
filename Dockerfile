FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
