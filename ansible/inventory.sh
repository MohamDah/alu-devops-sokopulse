#!/bin/sh
set -eu

case "${1:---list}" in
  --list)
    cd "$(dirname "$0")/../terraform"
    exec terraform output -json ansible_inventory
    ;;
  --host)
    printf '{}\n'
    ;;
  *)
    echo "Usage: $0 --list | --host HOST" >&2
    exit 1
    ;;
esac
