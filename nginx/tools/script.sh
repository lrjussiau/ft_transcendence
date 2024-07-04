#!/bin/bash

# Define color variables
GREEN='\033[0;32m'
NC='\033[0m'

# Get the hostname
HOSTNAME=$(hostname)

# Check if SSL certificates are already present
if [ ! -f /etc/ssl/certs/nginx.crt ]; then
    echo -e "${GREEN}Nginx: configuration de SSL ...${NC}"
    mkdir -p /etc/ssl/private /etc/ssl/certs
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout /etc/ssl/private/nginx.key -out /etc/ssl/certs/nginx.crt -subj "/C=CH/ST=Vaud/L=Lausanne/O=24kleaks/CN=$HOSTNAME"
    echo -e "${GREEN}Nginx: SSL est configuré !${NC}"
fi

# Update settings.py with the hostname
SETTINGS_FILE="/backend/pong_game/settings.py"
if grep -q "ALLOWED_HOSTS" "$SETTINGS_FILE"; then
    sed -i "s/ALLOWED_HOSTS = \[.*\]/ALLOWED_HOSTS = ['$HOSTNAME']/" "$SETTINGS_FILE"
else
    echo "ALLOWED_HOSTS = ['$HOSTNAME']" >> "$SETTINGS_FILE"
fi

# Update nginx.conf with the server_name
NGINX_CONF_FILE="/nginx/nginx.conf"
if grep -q "server_name" "$NGINX_CONF_FILE"; then
    sed -i "s/server_name .*/server_name $HOSTNAME;/" "$NGINX_CONF_FILE"
else
    echo "server_name $HOSTNAME;" >> "$NGINX_CONF_FILE"
fi

# Start Nginx in the foreground
nginx -g 'daemon off;'
