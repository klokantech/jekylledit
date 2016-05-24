#!/bin/bash
set -e
source activate
production build
docker push klokantech/jekylledit:$(_version)
