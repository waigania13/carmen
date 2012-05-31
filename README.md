carmen
------
utfgrid/mbtiles-based geocoder.

## Install

    npm install && ./scripts/install-dbs.sh

Installs dependencies and downloads the default tiles index.

## Usage

    npm start

Runs an example geocoding server at `http://localhost:3000`.

## API

    var Carmen = require('carmen');
    var carmen = new Carmen();
    carmen.geocode('Washington, DC', function(err, data) {
        console.log(data);
    });

### new Carmen(options)

Create a new Carmen object. Takes a hash of index objects to use, keyed by each `id`. Each index object should resemble the following:

    myindex: {
      // Required. MBTiles instance to be used.
      source: new MBTiles('./myindex.mbtiles'),
      // Optional. Search weight. Higher = greater priority.
      weight: 2,
      // Optional. Token filter. Return false to skip querying this index.
      filter: function(token) { return true; },
      // Optional. Map the feature data to a different output format.
      map: function(data) { return data; }
    }

If called with no arguments the default index objects are used.

### carmen.geocode([string], callback)

Geocode a string query. The result is passed to `callback(err, data)` in the following form:

    {
      query: ['washington', 'dc'],
      results: [
        [
          {
            lat: 38.8951148,
            lon: -77.0363716000006,
            name: 'Washington',
            type: 'city'
          },
          {
            lat: 38.9108045088125,
            lon: -77.0096131357235,
            name: 'District of Columbia',
            type: 'province'
          },
          {
            lat: 51.1974842447091,
            lon: -119.265098284354,
            name: 'United States of America',
            type: 'country'
          }
        ]
      ]
    }

Each array in `results` contains a match for the query, where the first feature in each match contains the matching element and subsequent elements describe other geographic features containing the first element.

`carmen.geocode()` can also be called with a pair of coordinates in the form `lon,lat` to do "reverse" geocoding. The result data is identical for a reverse geocoding query.

## Indexes

Each carmen index is an MBTiles file with an additional SQLite fulltext search table `carmen`. The table can be added by running

    ./scripts/addindex.sh MBTILES [SEARCH-FIELD]

The only requirement for a carmen MBTiles file is that it contains grids and features with a field suitable for use as search terms. Any additional keys included with features will be automatically passed through to the results. The following fields have special meaning to carmen if present:

- `lon` - longitude of the feature. If omitted, `lon` is calculated from the UTFGrid.
- `lat` - latitude of the feature. If omitted, `lat` is calculated from the UTFGrid.
- `type` - type of feature. If omitted, the index key is used.

Note that the UTFGrid-based centroid calculation for polygon features is currently very rough. Providing a more accurate lon/lat pair for these features is more performant and recommended.

### Designing for carmen in TileMill

Here are some guidelines if you are creating an MBTiles specifically for carmen in TileMill:

- Only the highest zoom level of an MBTiles is used by carmen. To save on disk space and render time you will probably want to export only the highest zoom level of your map.
- Since carmen uses the rendered UTFGrid you should ensure that the zoom level of your map is high enough to get the precision you want out of the UTFGrid.
- The field you use for search terms (by default `search`) can contain comma separated "synonyms". For example, a value of `United States, America` will allow searches for either `United States` or `America` to both match the same feature.
- Image tiles in your MBTiles can be helpful for debugging but are not strictly necessary. To remove them in order to save space:

        sqlite3 [mbtiles] "DELETE FROM images; UPDATE map SET tile_id = NULL; VACUUM;"

