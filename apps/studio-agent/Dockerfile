FROM node:22-slim

# Install system dependencies needed for node-canvas or sharp native compilations if required
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    && chmod +x /usr/local/bin/cloudflared \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Create data directories
RUN mkdir -p data/cache

EXPOSE 8080

CMD ["npm", "start"]
