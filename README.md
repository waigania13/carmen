# carmen

[Mapnik vector tile](https://github.com/mapbox/mapnik-vector-tile)-based geocoder with support for swappable data sources.
This is an implementation of some of the concepts of [Error-Correcting Geocoding](http://arxiv.org/abs/1102.3306) by [Dennis Luxen](http://algo2.iti.kit.edu/english/luxen.php).

[![Build Status](https://secure.travis-ci.org/mapbox/carmen.png)](https://travis-ci.org/mapbox/carmen)

## Depends

- Node v0.8.x or Node v0.10.x
- libprotobuf-lite and protoc compiler
- C++11 capable compiler (>= g++ 4.7 or >= clang 3.2)
- *Optional* libsqlite3 for [node-mbtiles](https://github.com/mapbox/node-mbtiles) storage backend

## Install

Ubuntu precise:

    sudo add-apt-repository ppa:george-edison55/gcc4.7-precise
    sudo apt-get update
    sudo apt-get install gcc-4.7 gcc g++ libprotobuf7 libprotobuf-dev protobuf-compiler

OSX / homebrew:

    brew install protobuf

All:

    npm install && ./scripts/install-dbs.sh

Note: if running as `root` user you need to do `npm install --unsafe-perm` to avoid `cannot run in wd carmen@0.1.0` error that prevents the build.

Installs dependencies and downloads the default tiles indexes (about 200MB of data).

## Command line

Carmen comes with command line utilities that also act as examples of API usage.

To query the default indexes:

    ./scripts/carmen.js --query="new york"

To analyze an index:

    ./scripts/carmen-analyze.js tiles/01-ne.country.mbtiles

## Example data

Example TM2 projects are available in the `datadev` branch.

------

## Carmen API

## Carmen(options)

Create a new Carmen geocoder instance. Takes a hash of index objects to use,
keyed by each `id`. Each index object should be an instance of a `CarmenSource`
object.

```js
var Carmen = require('carmen');
var MBTiles = require('mbtiles');
var geocoder = new Carmen({
    country: new MBTiles('./country.mbtiles'),
    province: new MBTiles('./province.mbtiles')
});

geocoder.geocode('New York', {}, callback);
```

Each `CarmenSource` is a tilelive API source that has additional geocoder
methods (see **Carmen Source API** below). In addition following
`tilelive#getInfo` keys affect how Carmen source objects operate.

attribute           | description
--------------------|------------
maxzoom             | The assumed zoom level of the zxy geocoder grid index.
shardlevel          | Optional. An integer order of magnitude that geocoder data is sharded. Defaults to 0.
format              | Optional. If set to `pbf` context operations will make use of vector tiles rather than utf grids.
geocoder_layer      | Optional. A string in the form `layer.field`. `layer` is used to determine what layer to query for context operations. Defaults to the first layer found in a vector source.
geocoder_address    | Optional. A flag (0/1) to indicate that an index can geocode address (house numbers) queries. Defaults to 0.
geocoder_resolution | Optional. Integer bonus against maxzoom used to increase the grid index resolution when indexing. Defaults to 0.

### geocode(query, options, callback)

Given a `query` string, call callback with `(err, results)` of possible contexts
represented by that string.

### index(from, to, pointer, callback)

Indexes docs using `from` as the source and `to` as the destination. Options can
be passed to `pointer` or omitted.

### verify(source, callback)

Verify the integrity of index relations for a given source.

### analyze(source, callback)

Analyze index relations for a given source. Generates stats on degenerate terms,
term => phrase relations, etc.

### wipe(source, callback)

Clear all geocoding indexes on a source.

------

## Carmen Source API

Carmen sources often [inherit from tilelive sources](https://github.com/mapbox/tilelive.js/blob/master/API.md).

### getFeature(id, callback)

Retrieves a feature given by `id`, calls `callback` with `(err, result)`

### putFeature(id, data, callback)

Inserts feature `data` and calls callback with `(err, result)`.

### startWriting(callback)

Create necessary indexes or structures in order for this carmen source to
be written to.

### putGeocoderData(index, shard, buffer, callback)

Put buffer into a shard with index `index`, and call callback with `(err)`

### getGeocoderData(index, shard, callback)

Get carmen record at `shard` in `index` and call callback with `(err, buffer)`

### getIndexableDocs(pointer, callback)

Get documents needed to create a forward geocoding datasource.

`pointer` is an optional object that has different behavior between sources -
it indicates the state of the database or dataset like a cursor would, allowing
you to page through documents.

`callback` is called with `(error, documents, pointer)`, in which `documents`
is a list of objects. Each object may have any attributes but the following are
required:

attribute | description
----------|------------
_id       | An integer ID for this feature.
_zxy      | An array of xyz tile coordinates covered by this feature.
_text     | Text to index for this feature. Synonyms, translations, etc. should be separated using commas.
_center   | An array in the form [lon,lat].
_bbox     | Optional. A bounding box in the form [minx,miny,maxx,maxy].
_score    | Optional. A float or integer to sort equally relevant results by. Higher values appear first.
_geometry | Optional. A geojson geometry object.

### TIGER address interpolation

Carmen has basic support for interpolating geometries based on TIGER address
range data. To make use of this feature the following additional keys must be
present.

attribute | description
----------|------------
_rangetype| The type of range data available. Only possible value atm is 'tiger'.
_geometry | A LineString or MultiLineString geometry object.
_lfromhn  | Single (LineString) or array of values (Multi) of TIGER LFROMHN field.
_ltohn    | Single (LineString) or array of values (Multi) of TIGER LTOHN field.
_rfromhn  | Single (LineString) or array of values (Multi) of TIGER RFROMHN field.
_rtohn    | Single (LineString) or array of values (Multi) of TIGER RTOHN field.
_parityl  | Single (LineString) or array of values (Multi) of TIGER PARITYL field.
_parityr  | Single (LineString) or array of values (Multi) of TIGER PARITYR field.

------

## Dev notes

Some incomplete notes about the Carmen codebase.

### Terminology

* Cache: an object that quickly loads sharded data from JSON or protobuf files
* Source: a Carmen source, such as S3, MBTiles, or memory

### Source structure

```
lib/
  [operations that are exposed in the public ui and do i/o]
  util/
    [algorithmically simple utilities]
  pure/
    [pure algorithms]
```

### Index structure

There are two types of index stores in Carmen.

- `cxxcache` is used for storing the `degen`, `term`, `phrase`, `grid`, and
  `freq` indexes. Each index is sharded and each shard contains a one-to-many
  hash with 32-bit integer keys that map to arrays of arbitrary length
  containing 32-bit integer elements.
- `feature` is used to store feature docs. Each index is sharded and each shard
  contains a one-to-many hash with 32-bit integer keys that map to a bundle of
  features. Each bundle contains feature documents keyed by their original, full
  id.

32-bit unsigned integers are widely used in the Carmen codebase because of their
performance, especially in V8 as keys of a hash object. To convert arbitrary
text (like tokenized text) to integers the FNV1a hash is used and sometimes
truncated to make room for additional encoded data.

### term (canonical, degenerate, weighted)

term | extra
-----|------
0-27 | 28-31

The first 28 bits of a term hash determine the canonical ID of a term. The
remaining 4 bits can be used for additional data.

- **Degenerates** are terms with delete operations performed on them. The extra
  4 bits are used to encode the number of delete operations (up to 15 chars)
  performed on the canonical term to result in the degenerate.
- **Weighted** terms are term hashes with weights (0-15) relative to other terms
  in the same phrase. The weights are only relevant in the context of the phrase
  being considered. A weight of 15 signifies the most significant term in the
  phrase with other terms being <= 15.

### phrase

sig term | phrase
---------|-------
0-11     | 12-31

The first 12 bits of a phrase hash are generated from the `fnv1a(str)` hash of
the most significant term (based on IDF of freq index) of a phrase. This scheme
clusters phrases in shards by the term used to query each phrase.

