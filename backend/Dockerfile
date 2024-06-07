# backend/Dockerfile

FROM python:3.9

WORKDIR /app

COPY requirements.txt /app/
RUN pip install -r requirements.txt

COPY . /app/

# Set environment variable for Django settings module
ENV DJANGO_SETTINGS_MODULE=supervisor.settings

# Ensure the script runs with Django properly initialized
RUN python manage.py migrate
RUN python init_admin.py

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
