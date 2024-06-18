#!/bin/sh

echo "I am in"

forge build

echo "It compiled"

anvil &

node ./scripts/Deploy.js
node /app/server.js