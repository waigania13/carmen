# Structure

```
lib/
  [operations that are exposed in the public ui and do i/o]
  util/
    [algorithmically simple utilities]
  pure/
    [pure algorithms]
```

# Hash

Features are indexed by hash values which are 32-bit integers. These integers
are generated based on the normalized, phrase-parsed words in the name of
the feature.

* `term`: FNV1a hash of a single (lowercase, ascii) word
* `distance`: the number of characters removed from the word
* `phrase`: FNV1a hash of (lowercase ascii) space-separated words, plus
  the encoding of its first term

The first term is included in the hash for phrases in order to cluster similar
road names on a common number, so that hashed searches don't require an extremely
high number of shards to be loaded.

## degenerate

```
  term      distance
 ___________________
|     0-30 | 31-32 |
|------------------|
```

### term

```
 unused       term
____________________
| 0-1  |     2-32 |
-------|------------
```

### phrase

```
 phrase   first term
____________________
| 0-19  |     20-32 |
--------|------------
```

`fnv1a(str)` is used to turn any string into a 32-bit integer by the FNV
hashing algorithm.

# Terminology

* Cache: an object that quickly loads sharded data from JSON or protobuf files
* Source: a Carmen source, such as S3, MBTiles, or memory

# Carmen API

## Carmen(options)

Initialize a Carmen object with an object in the format

```js
{
    "sourceid": CarmenSource
}
```

In which `CarmenSource` is an initialized Carmen source object.

## geocode(query, callback)

Given a `query` string, call callback with `(err, results)` of possible contexts
represented by that string.

## context(lon, lat, maxtype, callback)

Given a `lat`, `lon` pair, return a pyramid of features that contain that point,
in order decreasing specificity.

## search(source, query, id, callback)

Search a carmen source for features matching query.

## index(source, docs, callback)

Given a source and documents, index those documents into the source, pre-generating
varied terms and degenerates for use in geocoding.

## store(source, callback)

Serialize and make permanent the index currently in memory for a source.

# Carmen Source API

Carmen sources often [inherit from tilelive sources](https://github.com/mapbox/tilelive.js/blob/master/API.md).

## getFeature(id, callback)

Retrieves a feature given by `id`, calls `callback` with `(err, result)`

## putFeature(id, data, callback)

Inserts feature `data` and calls callback with `(err, result)`.

## startWriting(callback)

Create necessary indexes or structures in order for this carmen source to
be written to.

## putGeocoderData(index, shard, buffer, callback)

Put buffer into a shard with index `index`, and call callback with `(err)`

## getGeocoderData(index, shard, callback)

Get carmen record at `shard` in `index` and call callback with `(err, buffer)`

## getIndexableDocs(pointer, callback)

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
lon       | Float. Longitude.
lat       | Float. Latitude.
