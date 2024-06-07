# backend/Dockerfile
FROM python:3.9

WORKDIR /app

COPY requirements.txt /app/
RUN pip install -r requirements.txt

COPY . /app/

ENV DJANGO_SETTINGS_MODULE=pong_game.settings

RUN python manage.py migrate
RUN python init_admin.py

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

