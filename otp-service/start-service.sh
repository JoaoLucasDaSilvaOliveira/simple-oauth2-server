#!/bin/bash
set -euo pipefail

# Função que mata todos os processos filhos quando o script principal é encerrado
trap "kill 0" EXIT

echo "Iniciando Consumer..."
(cd cmd/consumer/main && go run main.go) &

echo "Iniciando Worker..."
(cd cmd/worker/main && go run main.go) &

# Aguarda até que todos os processos em background finalizem ou o script seja interrompido
wait