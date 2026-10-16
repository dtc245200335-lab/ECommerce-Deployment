#!/bin/bash
set -e

if [ -z "${MYSQL_EXPORTER_PASSWORD:-}" ]; then
  echo "MYSQL_EXPORTER_PASSWORD must be set to initialize the MySQL exporter account" >&2
  exit 1
fi

case "$MYSQL_EXPORTER_PASSWORD" in
  *[!A-Za-z0-9_-]*)
    echo "MYSQL_EXPORTER_PASSWORD may contain only letters, numbers, _ and -" >&2
    exit 1
    ;;
esac

docker_process_sql <<-EOSQL
  CREATE USER 'exporter'@'%' IDENTIFIED BY '${MYSQL_EXPORTER_PASSWORD}';
  GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
EOSQL