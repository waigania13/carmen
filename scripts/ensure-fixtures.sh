#!/usr/bin/env bash

DIR=`dirname $0`
DIR=$DIR/../fixtures

if [ ! -d "$DIR" ]; then
    mkdir "$DIR"

    FIXTURES="test-cities test-countries test-provinces"

    for NAME in $FIXTURES; do
      if [ ! -f "$DIR/$NAME.csv" ]; then
        echo "Downloading fixture $NAME..."
        curl -s -o "$DIR/$NAME.csv" "http://s3.amazonaws.com/mapbox/carmen/$NAME.csv"
      fi
    done
fi
