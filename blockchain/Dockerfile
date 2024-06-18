# Use the Foundry image from the repository
FROM ghcr.io/foundry-rs/foundry:latest

# Set the working directory
WORKDIR /app

# Install necessary Node.js packages
RUN apk update && apk add nodejs npm

# Copy Foundry project files
COPY src /app/src
COPY scripts /app/scripts
COPY foundry.toml /app/foundry.toml
# COPY lib /app/lib # Uncomment if you have libraries in the lib directory

# Copy and make the start script executable
COPY start_blockchain.sh /start_blockchain.sh
RUN chmod +x /start_blockchain.sh

COPY server.js /app/server.js
RUN chmod +x /app/server.js

# Expose the port for the API
EXPOSE 3000

# Start the blockchain services
CMD ["sh", "/start_blockchain.sh"]
