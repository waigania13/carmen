# Structure

```
lib/
  [operations that are exposed in the public ui and do i/o]
  util/
    [algorithmically simple utilities]
  pure/
    [pure algorithms]
```

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

## putCarmen(index, shard, buffer, callback)

Put buffer into a shard with index `index`, and call callback with `(err)`

## getCarmen(index, shard, callback)

Get carmen record at `shard` in `index` and call callback with `(err, buffer)`
