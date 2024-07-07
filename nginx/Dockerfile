FROM nginx:alpine

# Installer OpenSSL et sed
RUN apk add --no-cache openssl sed

# Définir une variable d'argument pour la construction
ARG HOSTNAME_VAR
RUN echo "HOSTNAME_VAR is: ${HOSTNAME_VAR}"

# Copier les fichiers de configuration et le script
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/mime.types /etc/nginx/mime.types

# Copier les certificats SSL
COPY ./nginx/certs /etc/ssl/certs
COPY ./nginx/private /etc/ssl/private

# Copier les fichiers du frontend
COPY ../frontend/website /usr/share/nginx/html

# Remplacer 'hostname' par la valeur de HOSTNAME_VAR dans nginx.conf
RUN sed -i "s/hostname/${HOSTNAME_VAR}/g" /etc/nginx/nginx.conf

# Copier le script
COPY ./nginx/tools/script.sh /usr/local/bin/script.sh

# Rendre le script exécutable
RUN chmod +x /usr/local/bin/script.sh

# Exécuter le script
CMD ["sh", "/usr/local/bin/script.sh"]
