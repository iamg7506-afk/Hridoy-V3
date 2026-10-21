FROM node:20-bookworm-slim

# native libs needed by "canvas" + ffmpeg helpers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config git ca-certificates \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .
EXPOSE 3000 3001
HEALTHCHECK --interval=60s --timeout=5s --start-period=60s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "index.js"]
