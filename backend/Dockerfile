FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/generated ./src/generated

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node","dist/index.js"]
