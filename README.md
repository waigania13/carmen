carmen
------
Experiment with geocoding using MBTiles as the index.

## Install

    npm install

Installs dependencies and downloads the curren tiles index.

## Overview

1. Geocoding request comes in, e.g. "Massachusetts Ave Washington, DC"
2. Tokenize: `massachusetts ave`, `washington`, `dc`
3. Search each MBTiles' `keymap` table for each token and retrieve tile `zxy` coordinates.
4. For each match, tally a score for that tile. Sum the score for a tile based on how many matches it had as well as any of its "parent" tiles (lower zoom levels).
5. Tile with highest match wins -- return the lat lon based on tile coordinate.

## TODO

1. Better data. These were baked one night from TileMill starter shapefiles.
2. Use UTFGrid for more accurate location return.
3. Index / improve efficiency of `keymap` lookup. Maybe use `key_name` column for search term and `key_json` column for feature geodata.
4. Better tokenizer / more heuristics.
5. And more!
