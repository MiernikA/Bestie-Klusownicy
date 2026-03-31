#!/bin/sh
set -eu

envsubst '${APP_API_BASE_URL} ${APP_WS_BASE_URL}' \
    < /usr/share/nginx/html/config.js.template \
    > /usr/share/nginx/html/config.js
