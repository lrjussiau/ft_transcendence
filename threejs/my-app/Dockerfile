# Utiliser l'image Node.js officielle
FROM node:14

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json pour installer les dépendances en premier
COPY package*.json ./

# Installer les dépendances du projet
RUN npm install

# Copier le reste des fichiers du projet dans le conteneur
COPY . .

# Installer un serveur statique pour servir l'application
RUN npm install -g serve

# Exposer le port 3000
EXPOSE 3000

# Commande pour démarrer le serveur
CMD ["serve", "-s", ".", "-l", "3000"]
