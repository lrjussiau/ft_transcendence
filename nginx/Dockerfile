FROM nginx:alpine

RUN apk add --no-cache openssl sed

ARG HOSTNAME_VAR
RUN echo "HOSTNAME_VAR is: ${HOSTNAME_VAR}"

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/mime.types /etc/nginx/mime.types

COPY ./nginx/certs /etc/ssl/certs
COPY ./nginx/private /etc/ssl/private
COPY ../frontend/website /usr/share/nginx/html

RUN sed -i "s/hostname/${HOSTNAME_VAR}/g" /etc/nginx/nginx.conf

COPY ./nginx/tools/script.sh /usr/local/bin/script.sh
RUN chmod +x /usr/local/bin/script.sh

CMD ["sh", "/usr/local/bin/script.sh"]
