#!/usr/bin/env sh
set -eu

secrets_dir="${1:-secrets}"
mkdir -p "$secrets_dir"

create_secret() {
  file="$secrets_dir/$1"
  if [ ! -f "$file" ]; then
    umask 077
    openssl rand -base64 36 > "$file"
  fi
}

create_secret postgres_password
create_secret pet_db_password
create_secret agenda_db_password
create_secret financeiro_db_password
create_secret jwt_secret
create_secret internal_service_secret

printf 'Segredos locais criados em %s (não versionados).\n' "$secrets_dir"

