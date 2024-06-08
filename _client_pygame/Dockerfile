# Utiliser une image de base avec Python
FROM python:3.9-slim

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    xvfb \
    ffmpeg \
    libsdl2-dev \
    libsdl2-image-dev \
    libsdl2-mixer-dev \
    libsdl2-ttf-dev \
    libsmpeg-dev \
    libsdl1.2-dev \
    libportmidi-dev \
    libfreetype6-dev \
    libavformat-dev \
    libswscale-dev \
    libjpeg-dev \
    libtiff5-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de requirements dans le conteneur
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste de l'application
COPY . .

# Script pour démarrer xvfb et exécuter Pygame
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exposer le port pour VNC
EXPOSE 5900

# Définir la commande par défaut pour exécuter le client Pygame
CMD ["/entrypoint.sh"]
