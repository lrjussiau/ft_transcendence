#!/bin/bash

# Define color variables
GREEN='\033[0;32m'
NC='\033[0m'

# Check if SSL certificates are already present
if [ ! -f /etc/ssl/certs/nginx.crt ]; then
    echo -e "${GREEN}Nginx: configuration de SSL ...${NC}"
    mkdir -p /etc/ssl/private /etc/ssl/certs
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout /etc/ssl/private/nginx.key -out /etc/ssl/certs/nginx.crt -subj "/C=CH/ST=Vaud/L=Lausanne/O=24kleaks/CN=c3r3s1.42lausanne.ch"
    echo -e "${GREEN}Nginx: SSL est configuré !${NC}"
fi

# Start Nginx in the foreground
nginx -g 'daemon off;'
