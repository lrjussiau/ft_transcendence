
#if [ -f /app/.env ]; then
#    export $(cat /app/.env | xargs)
#fi
#forge build
#node ./scripts/deploy.js
#node ./server.js

#!/bin/sh

forge build
anvil &
node ./scripts/deploy.js
node server.js

