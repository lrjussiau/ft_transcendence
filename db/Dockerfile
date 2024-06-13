# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Expose the PostgreSQL port
EXPOSE 5432

# The official PostgreSQL image automatically runs the PostgreSQL server,
# so no CMD or ENTRYPOINT instruction is needed here.
