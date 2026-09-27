FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN mkdir -p storage/uploads storage/videos

ENV NODE_ENV=production
ENV PORT=10000
ENV DEMO_MODE=true

EXPOSE 10000

CMD ["npm", "start"]
