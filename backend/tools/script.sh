#!/bin/bash

# URL de l'image à télécharger
IMAGE_URL1="https://cdn.intra.42.fr/users/691f632ce11bd5527255a3dc742d2db5/vrey.jpg"
IMAGE_URL2="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/NES-ROB.jpg/330px-NES-ROB.jpg"

# Nom du fichier de destination
DESTINATION_FILE1="default_avatar.png"
DESTINATION_FILE2="ai.png"

# Téléchargez l'image
curl -o ${DESTINATION_FILE1} ${IMAGE_URL1}
curl -o ${DESTINATION_FILE2} ${IMAGE_URL2}

