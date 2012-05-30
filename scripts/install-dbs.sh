#!/usr/bin/env bash

DIR=`dirname $0`
TILE_DIR=$DIR/../tiles

if [ ! -d "$TILE_DIR" ]; then
    mkdir "$TILE_DIR"
fi

TILES="carmen-city carmen-country carmen-province"

for NAME in $TILES; do
  if [ ! -f "$TILE_DIR/$NAME.mbtiles" ]; then
    echo "Downloading $NAME..."
    curl -s -o "$TILE_DIR/$NAME.mbtiles" "http://s3.amazonaws.com/mapbox/carmen/$NAME.mbtiles"
  fi
done

for NAME in $TILES; do
  echo "Indexing $NAME..."
  $DIR/addindex.sh "$TILE_DIR/$NAME.mbtiles"
done
