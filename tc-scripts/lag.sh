#!/bin/bash

ACTION=$1
BACKEND_IP=$(getent hosts backend | awk '{ print $1 }')

if [ -z "$BACKEND_IP" ]; then
  echo "Could not resolve backend service IP address."
  exit 1
fi

if [ "$ACTION" == "add" ]; then
  echo "Adding even more extreme network conditions: delay=1000ms, variation=200ms, loss=50%"
  tc qdisc del dev eth0 root netem 2>/dev/null
  tc qdisc add dev eth0 root netem delay 1000ms 200ms loss 50%

  echo "Testing latency to backend container:"
  ping -c 4 $BACKEND_IP || echo "ping failed"

  echo "Testing bandwidth to backend container using iperf3:"
  iperf3 -c $BACKEND_IP -p 5201 -t 10 || echo "iperf3 test failed"
elif [ "$ACTION" == "del" ]; then
  echo "Removing network conditions"
  tc qdisc del dev eth0 root netem
else
  echo "Usage: $0 {add|del}"
  echo "Example: docker-compose exec tc /tc-scripts/lag.sh add"
  echo "Example: docker-compose exec tc /tc-scripts/lag.sh del"
fi
