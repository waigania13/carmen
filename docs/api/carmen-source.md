# Carmen Source API

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

Each document is a valid geojson `Feature`. Each feature should contain a unique `id` field
as well as the following settings in the `properties` object.

attribute         | description
------------------|------------
`carmen:text`     | Default text to index for this feature. Synonyms, translations, etc. should be separated using commas.
`carmen:text_{language code}`     | Localized to index for this feature. Synonyms, translations, etc. should be separated using commas and will be synonymized with `carmen:text`.
`carmen:center`   | Optional. An array in the form [lon,lat]. center must be on the geometry surface, or the center will be recalculated.
`carmen:score`    | Optional. A float or integer to sort equally relevant results by. Higher values appear first. Docs with negative scores can contribute to a final result but are only returned if included in matches of a forward search query.
`carmen:addressnumber`  | Optional. Used with `geocoder_address`. An array of addresses corresponding to the order of their geometries in the `GeometryCollection`
`carmen:types`    | Optional. An array of types associating this feature with one or more feature classes defined by the source-level `geocoder_type` key. By setting multiple types a feature can move between various feature levels depending on the query and results. If omitted, defaults to the `geocoder_type` set by the feature's index.

### TIGER address interpolation

Carmen has basic support for interpolating geometries based on TIGER address
range data. To make use of this feature the following additional keys must be
present in the properties object.

attribute           | description
--------------------|------------
`carmen:rangetype`  | The type of range data available. Only possible value atm is 'tiger'.
`carmen:lfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER LFROMHN field.
`carmen:ltohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER LTOHN field.
`carmen:rfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER RFROMHN field.
`carmen:rtohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER RTOHN field.
`carmen:parityl`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYL field.
`carmen:parityr`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYR field.

------

### Example

```JSON
{
  "id": "7654",
  "type": "Feature",
  "properties": {
    "carmen:text": "Main Street",
    "carmen:center": [ -97.1, 37 ],
    "carmen:score": 99,
    "carmen:rangetype": "tiger",
    "carmen:lfromhn": [ "100", "200" ],
    "carmen:ltohn": ["198", "298"],
    "carmen:rfromhn": ["101", "201"],
    "carmen:rtohn": ["199", "299"],
    "carmen:parityl": ["E", "E"],
    "carmen:parityr": ["O", "B"],
  },
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [ -97, 37 ],
        [ -97.2, 37 ],
        [ -97.2, 37.2 ]
      ],
      [
        [ -97.2, 37.2 ],
        [ -97.4, 37.2 ],
        [ -97.4, 37.4 ]
      ]
    ]
  }
}
```
