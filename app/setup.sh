#!/bin/sh
set -e

export VERSION="$1"
SETUP_MODE="$2"

if [ "$SETUP_MODE" = "development" ]; then
    (cd /venv/app; /venv/bin/python setup.py develop)
elif [ "$SETUP_MODE" = "production" ]; then
    (cd /venv/app; /venv/bin/python setup.py install)
else
    echo "Invalid setup mode: $SETUP_MODE"
    exit 1
fi
