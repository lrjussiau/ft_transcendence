#!/bin/sh

forge build
anvil &
node ./scripts/deploy.js
node server.js