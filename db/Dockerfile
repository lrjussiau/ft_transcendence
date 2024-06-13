# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

# Set environment variables
ENV POSTGRES_DB=mydatabase
ENV POSTGRES_USER=myuser
ENV POSTGRES_PASSWORD=mypassword

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Expose the PostgreSQL port
EXPOSE 5432

# The official PostgreSQL image automatically runs the PostgreSQL server,
# so no CMD or ENTRYPOINT instruction is needed here.
