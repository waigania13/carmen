#!/bin/bash

set -e

COMMIT_MESSAGE=$(git show -s --format=%B $TRAVIS_COMMIT | tr -d '\n')

if test "${COMMIT_MESSAGE#*'[publish binary]'}" != "$COMMIT_MESSAGE"
    then
    npm install aws-sdk
    ./node_modules/.bin/node-pre-gyp package testpackage
    ./node_modules/.bin/node-pre-gyp publish info

    # Uninstall lib protobuf.
    # Intended to confirm that binary has no deps on external libs.
    build_dir="$(pwd)"
    cd /tmp/protobuf-2.5.0
    sudo make uninstall
    cd $build_dir

    rm -rf build
    rm -rf lib/binding
    npm install --fallback-to-build=false
    npm test

    node-pre-gyp info
fi
