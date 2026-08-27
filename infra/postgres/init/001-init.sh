#!/usr/bin/env sh
set -eu

export PGPASSWORD="$(cat /run/secrets/postgres_password)"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=pet_password="$(cat /run/secrets/pet_db_password)" \
  --set=agenda_password="$(cat /run/secrets/agenda_db_password)" \
  --set=financeiro_password="$(cat /run/secrets/financeiro_db_password)" \
  --file=/docker-entrypoint-initdb.d/sql/schema.sql
