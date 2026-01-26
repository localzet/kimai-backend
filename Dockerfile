FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
COPY . .
# Generate Prisma client for linux-musl so it exists inside the image
# and can be used by the openapi export step which runs in build.
RUN npx prisma generate --schema=./prisma/schema.prisma --binary-target=linux-musl
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
