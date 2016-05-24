#!/bin/bash
set -e
source activate
production build app
docker push klokantech/jekylledit:$(_version)
