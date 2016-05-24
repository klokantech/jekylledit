#!/bin/bash
set -e
source activate
production build app
echo docker push klokantech/jekylledit:$(_version)
docker push klokantech/jekylledit:$(_version)
docker tag klokantech/jekylledit:$(_version) klokantech/jekylledit:latest
docker push klokantech/jekylledit:latest
