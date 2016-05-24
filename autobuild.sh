#!/bin/bash
set -e
if [ `git describe --tags --long | cut -d- -f2` -eq 0 ]; then
    source activate
    production build app
    echo docker push klokantech/jekylledit:$(_version)
    docker tag klokantech/jekylledit:$(_version) klokantech/jekylledit:latest
    docker push klokantech/jekylledit:$(_version)
    docker push klokantech/jekylledit:latest
fi
