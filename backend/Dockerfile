FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/assets ./assets

EXPOSE 4000

# Baza sxemasi faqat migratsiyalar orqali o'zgaradi (prisma/migrations). db push ishlatilmaydi:
# u ustun o'chirilganda ma'lumotni yo'qotishi yoki serverni ishga tushirmay qo'yishi mumkin edi.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
