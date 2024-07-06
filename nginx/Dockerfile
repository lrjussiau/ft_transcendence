FROM nginx:alpine

# Installer OpenSSL
RUN apk add --no-cache openssl

# Copier les fichiers de configuration et le script
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/mime.types /etc/nginx/mime.types

# Copier les certificats SSL (au cas où ils existent déjà)
COPY ./nginx/certs /etc/ssl/certs
COPY ./nginx/private /etc/ssl/private

# Copier les fichiers du frontend
COPY ../frontend/website /usr/share/nginx/html

# Copier le script
COPY ./nginx/tools/script.sh /usr/local/bin/script.sh

# Rendre le script exécutable
RUN chmod +x /usr/local/bin/script.sh

# Exécuter le script
CMD ["sh", "/usr/local/bin/script.sh"]
