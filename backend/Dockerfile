FROM python:3.9

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY tools/script.sh /app/script.sh

RUN pip install --no-cache-dir -r requirements.txt
RUN chmod +x /app/script.sh
RUN sh /app/script.sh

COPY . /app
RUN mkdir -p /app/media/avatars/ && mv default_avatar.png ai.png /app/media/avatars/


EXPOSE 8000

CMD ["sh", "-c", "python manage.py wait_for_db && python manage.py makemigrations && python manage.py migrate && python manage.py create_ai_opponent && daphne -b 0.0.0.0 -p 8000 pong_game.asgi:application"]
