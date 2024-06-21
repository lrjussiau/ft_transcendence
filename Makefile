DOCKER_COMPOSE_FILE := docker-compose.yml

build:
	@echo "Construction des images Docker..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) build

up:
	@echo "Démarrage des conteneurs..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) up -d

down:
	@echo "Arrêt et suppression des conteneurs..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down

nuke:
	docker system prune -af


re:
	make down; make build; make up;

help:
	@echo "Utilisation : make [commande]"
	@echo "Commandes :"
	@echo "  build   : Construire les images Docker"
	@echo "  up      : Démarrer les conteneurs"
	@echo "  down    : Arrêter et supprimer les conteneurs"
	@echo "  nuke    : Tout supprimer ce qu'a installé Docker"
	@echo "  re      : make down, build and up"
	@echo "  help    : Afficher ce message d'aide"


.DEFAULT_GOAL := help