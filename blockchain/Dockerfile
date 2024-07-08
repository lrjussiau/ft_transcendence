FROM ghcr.io/foundry-rs/foundry:latest


WORKDIR /app

ARG SEPOLIA_URL
ARG PRIVATE_KEY

RUN apk update && apk add nodejs npm
RUN npm install express body-parser ethers dotenv

COPY src /app/src
COPY scripts /app/scripts
RUN chmod -R +x /app/scripts
COPY foundry.toml /app/foundry.toml


COPY start_blockchain.sh /app/scripts/start_blockchain.sh
RUN chmod +x /app/scripts/start_blockchain.sh

RUN find /app -type f -name "*.sh" -exec sed -i 's/\r$//' {} +

COPY server.js /app/server.js
RUN chmod +x /app/server.js

# COPY .env /app/.env


EXPOSE 3000


CMD ["/bin/sh ./scripts/start_blockchain.sh"]
# docker run -it --env-file .env transcendence-blockchain