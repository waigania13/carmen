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
  ./addindex.sh "tiles/$name.mbtiles"
done

