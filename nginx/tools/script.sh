#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

if [ ! -f /etc/ssl/certs/nginx.crt ]; then
    echo -e "${GREEN}Nginx: configuration de SSL ...${NC}"
    mkdir -p /etc/ssl/private /etc/ssl/certs
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout /etc/ssl/private/nginx.key -out /etc/ssl/certs/nginx.crt -subj "/C=CH/ST=Vaud/L=Lausanne/O=24kleaks/CN=$HOSTNAME"
    echo -e "${GREEN}Nginx: SSL est configuré !${NC}"
fi

nginx -g 'daemon off;'
