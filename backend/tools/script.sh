#!/bin/bash

# URL de l'image à télécharger
IMAGE_URL="https://cdn.intra.42.fr/users/691f632ce11bd5527255a3dc742d2db5/vrey.jpg"

# Nom du fichier de destination
DESTINATION_FILE="default_avatar.png"

curl -o ${DESTINATION_FILE} ${IMAGE_URL}
mv $DESTINATION_FILE /app/media/avatars
