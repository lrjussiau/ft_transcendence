#!/bin/zsh

# Fonction pour configurer Docker en mode rootless
install_docker_rootless() {
    echo "Installing Docker in rootless mode..."

    # Vérification si Docker rootless est déjà installé
    if [ -f "$HOME/bin/dockerd" ]; then
        echo "Rootless Docker is already installed at $HOME/bin/dockerd"
        echo "Stopping existing rootless Docker service..."
        systemctl --user stop docker
        echo "Removing existing rootless Docker..."
        rm -f $HOME/bin/dockerd
    fi

    # Téléchargement et installation de Docker rootless
    curl -fsSL https://get.docker.com/rootless | sh

    # Configuration des variables d'environnement
    {
        echo 'export PATH=$HOME/bin:$PATH'
        echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock'
    } >> ~/.zshrc

    # Recharger le shell
    source ~/.zshrc

    # Démarrer Docker rootless
    systemctl --user start docker

    # Activer Docker rootless au démarrage de la session
    systemctl --user enable docker

    # Téléchargement et installation de Docker Compose
    mkdir -p $HOME/bin
    curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o $HOME/bin/docker-compose
    chmod +x $HOME/bin/docker-compose

    # Ajout de Docker Compose au PATH
    echo 'export PATH=$HOME/bin:$PATH' >> ~/.zshrc
    source ~/.zshrc

    echo "Docker rootless mode installed successfully."
}

# Fonction pour restaurer Docker en mode normal
restore_docker_normal() {
    echo "Restoring Docker to normal mode..."

    # Arrêter Docker rootless
    systemctl --user stop docker
    systemctl --user disable docker

    # Supprimer les configurations de rootless dans ~/.zshrc
    sed -i '/export PATH=$HOME\/bin:$PATH/d' ~/.zshrc
    sed -i '/export DOCKER_HOST=unix:\/\/\/run\/user\/$(id -u)\/docker.sock/d' ~/.zshrc

    # Recharger le shell
    source ~/.zshrc

    systemctl --user start docker
    systemctl --user enable docker

    echo "Docker restored to normal mode. Please restart your session or start the Docker service manually."
}

# Menu pour sélectionner l'option
echo "Select an option:"
echo "1. Install Docker in rootless mode"
echo "2. Restore Docker to normal mode"
echo -n "Enter your choice (1 or 2): "
read choice

case $choice in
    1)
        echo "You have chosen to install Docker in rootless mode."
        echo "This will configure Docker to run without requiring root permissions, making it more secure for use in a multi-user environment."
        install_docker_rootless
        ;;
    2)
        echo "You have chosen to restore Docker to normal mode."
        echo "This will revert Docker to its standard configuration, requiring root permissions to run."
        restore_docker_normal
        ;;
    *)
        echo "Invalid option. Please run the script again and select 1 or 2."
        ;;
esac
