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

## context(lon, lat, maxtype, callback)

## search(source, query, id, callback)

## index(source, docs, callback)

## store(source, callback)

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
