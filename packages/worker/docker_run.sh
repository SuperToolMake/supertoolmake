#!/usr/bin/env sh

if [ -z "$CLUSTER_MODE" ]; then
  exec node --enable-source-maps dist/index.js
else
  exec pm2-runtime start pm2.config.js
fi
