FROM node:20-alpine AS build

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

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY public/config.js.template /usr/share/nginx/html/config.js.template
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
