FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY jsconfig.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.js ./
COPY public ./public
COPY src ./src

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
