#!/bin/sh

# SEPOLIA_URL=${SEPOLIA_URL}
# PRIVATE_KEY=${PRIVATE_KEY}
# if [ -f /app/.env ]; then
#    export $(cat /app/.env | xargs)
# fi
# forge build
# node ./scripts/deploy.js
# node ./server.js

echo "Sepolia  : ${SEPOLIA_URL}"
echo "Private k: ${PRIVATE_KEY}"

forge build
anvil &
node ./scripts/deploy.js
node server.js

