#!/usr/bin/env bash

mkdir -p tiles
mkdir -p fixtures

fixtures=(
  "test-cities"
  "test-countries"
  "test-provinces"
)

for name in "${fixtures[@]}"
do
  if [ ! -f "fixtures/$name.csv" ]; then
    echo "Downloading fixture $name..."
    curl -s -o "fixtures/$name.csv" "http://s3.amazonaws.com/mapbox/carmen/$name.csv"
  fi
done

tiles=(
  "carmen-city"
  "carmen-country"
  "carmen-province"
#  "carmen-zcta"
)

for name in "${tiles[@]}"
do
  if [ ! -f "tiles/$name.mbtiles" ]; then
    echo "Downloading $name..."
    curl -s -o "tiles/$name.mbtiles" "http://s3.amazonaws.com/mapbox/carmen/$name.mbtiles"
  fi
done

for name in "${tiles[@]}"
do
  INDEXED=`sqlite3 "tiles/$name.mbtiles" "SELECT '1' FROM sqlite_master WHERE name = 'carmen';"`
  if [ -z $INDEXED ]; then
    # Create search table. Inserts id, text, zxy into `carmen` table.
    echo "Indexing $name..."
    echo "CREATE INDEX IF NOT EXISTS map_grid_id ON map (grid_id);" > carmen-index.sql
    echo "CREATE VIRTUAL TABLE carmen USING fts4(id,text,zxy,tokenize=simple);" >> carmen-index.sql
    echo "BEGIN TRANSACTION;" >> carmen-index.sql

    sqlite3 "tiles/$name.mbtiles" "SELECT k.key_name, k.key_json, zoom_level||'/'||tile_column ||'/'||tile_row AS zxy FROM keymap k JOIN grid_key g ON k.key_name = g.key_name JOIN map m ON g.grid_id = m.grid_id WHERE k.key_json LIKE '%search%'" \
      | sed "s/\([^|]*\)|.*\"search\":\"\([^\"]*\)\"[^|]*|\(.*\)/INSERT INTO carmen VALUES(\"\1\",\"\2\",\"\3\");/" \
      >> carmen-index.sql

    echo "COMMIT;" >> carmen-index.sql

    sqlite3 "tiles/$name.mbtiles" < carmen-index.sql
    rm carmen-index.sql
  fi
done

