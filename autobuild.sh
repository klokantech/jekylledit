#!/bin/bash
set -e

VERSION=$(git describe --tags --long | cut -d- -f1 | cut -c2-10)

rm -rf app/jekylledit/static/js
mkdir app/jekylledit/static/js
docker-compose run --rm -e TARGET=/mnt javascript make build

docker build -t klokantech/jekylledit:$VERSION app
docker tag klokantech/jekylledit:$VERSION klokantech/jekylledit:latest
docker push klokantech/jekylledit:$VERSION
docker push klokantech/jekylledit:latest
