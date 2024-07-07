# Use the official Python image from the Docker Hub
FROM python:3.9

# Set the working directory
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt /app/requirements.txt
COPY tools/script.sh /app/script.sh

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN chmod +x /app/script.sh

# Copy the rest of the application code into the container
COPY . /app

RUN sh script.sh
# Expose port 8000
EXPOSE 8000

# Command to run on container start
CMD ["sh", "-c", "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 pong_game.asgi:application"]
