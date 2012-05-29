carmen
------
utfgrid/mbtiles-based geocoder.

## Install

    npm install

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
      // Required. Zoom level for this index.
      zoom: 8,
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
