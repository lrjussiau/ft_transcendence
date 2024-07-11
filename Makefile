DOCKER_COMPOSE_FILE := docker-compose.yml

.PHONY: build up down nuke re help

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
	@echo "Arrêt et suppression de tous les conteneurs et ressources Docker liés au fichier docker-compose..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down --remove-orphans
	@if [ -n "$$(docker images -q $$(docker-compose -f $(DOCKER_COMPOSE_FILE) config | grep 'image:' | awk '{print $$2}'))" ]; then docker rmi -f $$(docker images -q $$(docker-compose -f $(DOCKER_COMPOSE_FILE) config | grep 'image:' | awk '{print $$2}')); fi

clear_db:
	@docker exec -it db psql -U val -d pongdatabase -c "\
	DO \$$\$$ \
	DECLARE r RECORD; \
	BEGIN \
		FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) \
		LOOP \
			EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; \
		END LOOP; \
	END \$$\$$;"

ww3: clear_db
	@echo "Arrêt et suppression des conteneurs..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down
	@echo "Arrêt et suppression de tous les conteneurs et ressources Docker liés au fichier docker-compose..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down --remove-orphans
	@if [ -n "$$(docker images -q $$(docker-compose -f $(DOCKER_COMPOSE_FILE) config | grep 'image:' | awk '{print $$2}'))" ]; then docker rmi -f $$(docker images -q $$(docker-compose -f $(DOCKER_COMPOSE_FILE) config | grep 'image:' | awk '{print $$2}')); fi
	@echo "☠️☠️☠️"
	@docker system prune -af


re: down build up

help:
	@echo "Utilisation : make [commande]"
	@echo "Commandes :"
	@echo "  build   : Construire les images Docker"
	@echo "  up      : Démarrer les conteneurs"
	@echo "  down    : Arrêter et supprimer les conteneurs"
	@echo "  nuke    : Tout supprimer ce qu'a installé Docker avec docker-compose"
	@echo "  ww3     : ☠️ Down, nuke, Prune... ☠️"
	@echo "  re      : Réaliser down, build et up"
	@echo "  help    : Afficher ce message d'aide"

.DEFAULT_GOAL := help
