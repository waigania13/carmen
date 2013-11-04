# Carmen Source API

## getFeature(id, callback)

Retrieves a feature given by `id`, calls `callback` with `(err, result)`

## putFeature(id, data, callback)

Inserts feature `data` and calls callback with `(err, result)`.

## startWriting(callback)

Create necessary indexes or structures in order for this carmen source to
be written to.
