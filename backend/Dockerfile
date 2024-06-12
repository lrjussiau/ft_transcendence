FROM python:3.9

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y && apt-get clean

# Copy project
COPY . /app/

# Command to run Daphne server
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "pong_game.asgi:application"]
