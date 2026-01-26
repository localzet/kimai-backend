FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
