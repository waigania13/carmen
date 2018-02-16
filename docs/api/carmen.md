# Carmen(options)

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

| attribute               | description                                                                            |
|-------------------------|----------------------------------------------------------------------------------------|
| maxzoom                 | The assumed zoom level of the zxy geocoder grid index.                                 |
| geocoder_layer          | Optional. A string in the form `layer.field`. `layer` is used to determine what layer  | to query for context operations. Defaults to the first layer found in a vector source.
| geocoder_address        | Optional. A flag (0/1) to indicate that an index can geocode address (house numbers) q | ueries. Defaults to 0.
| geocoder_format         | Optional. A string containing how to format the resulting `place_name` field. Ie: `{ad | dress._number} {address._name} {place._name}` where `address`/`place` are the extid of a given index and `_name`/`_number` are internal carmen designators to replace with the first text value from `carmen:text` & the matched address. This string can also map to string properties on the geojson. ie `{extid.title}` would be replace with `feature.properties.title` for the indexed GeoJSON for the given extid. By adding multiple `geocoder_format` keys with a language tag (e.g. `geocoder_format_zh`), multiple formats can be supported and engaged by using a `language` flag. See `test/geocoder-unit.address-format.test.js` for more examples.
| geocoder_resolution     | Optional. Integer bonus against maxzoom used to increase the grid index resolution whe | n indexing. Defaults to 0.
| geocoder_group          | Optional + advanced. For indexes that share the exact same tile source, IO operations  | can be grouped. No default.
| geocoder_tokens         | Optional + advanced. An object with a 1:1 from => to mapping of token strings to repla | ce in input queries. e.g. 'Streets' => 'St'.
| geocoder_name           | Optional + advanced. A string to use instead of the provided config index id/key allow | ing multiple indexes to be treated as a single "logical" index.
| geocoder_type           | Optional + advanced. A string to be used instead the config index id/key. Omission of  | this falls back to geocoder_name and then to the id.
| geocoder_types          | Optional + advanced. An array of type strings. Only necessary for indexes that include | multitype features.
| geocoder_version        | Required. Should be set to **7** for carmen@rocksdb. Index versions <= 1 can be used f | or reverse geocoding but not forward.
| geocoder_cachesize      | Optional + advanced. Maximum number of shards to allow in the `carmen-cache` message c | ache. Defaults uptream to 65536 (maximum number of possible shards).
| geocoder_address_order  | Optional + advanced. A string that can be set to `ascending` or `descending` to indica | te the expected ordering of address components for an index. Defaults to `ascending`.
| geocoder_inherit_score  | Optional + advanced. Set to `true` if features from this index should appear above oth | er identically (ish) named parent features that are part of its context (e.g. promote New York (city) promoted above New York (state)). Defaults to `false`.
| geocoder_universal_text | Optional + advanced. Set to `true` if features from this index should be considered la | nguage agnostic (e.g. postcodes). They will bypass the `languageMode=strict` flag and the `carmen:text` field will be treated as compatible with any language. Defaults to `false`.

*Note: The sum of maxzoom + geocoder_resolution must be no greater than 14.*

### geocoder_version < 1

attribute               | description
------------------------|------------
geocoder_shardlevel     | Deprecated. An integer order of magnitude that geocoder data is sharded. Defaults to 0.

### geocode(query, options, callback)

Given a `query` string, call callback with `(err, results)` of possible contexts
represented by that string. The following are all optional and can be provided
as part of the `options` object:

- `limit` - number. Adjust the maximium number of features returned. Defaults to 5.
- `proximity` - a `[ lon, lat ]` array to use for biasing search results.
  Features closer to the proximity value will be given priority over those
  further from the proximity value.
- `types` - an array of string types. Only features matching one of the types
  specified will be returned.
- `allow_dupes` - boolean. If true, carmen will allow features with identical
  place names to be returned. Defaults to false.
- `debug` - boolean. If true, the carmen debug object will be returned as part
  of the results and internal carmen properties will be preserved on feature
  output. Defaults to false.
- `stats` - boolean. If true, the carmen stats object will be returned as part
  of the results.
- `language` - One or more ISO 639-1 codes, separated by commas to be displayed.
  Only the first language code is used when prioritizing forward geocode results
  to be matched. If `carmen:text_{lc}` and/or `geocoder_format_{lc}` are
  available on a features, response will be returned in that language and
  appropriately formatted.
- `languageMode` - string. If set to `"strict"` the returned features will be
  filtered to only those with text matching the language specified by the
  `language` option. Has no effect if `language` is not set.
- `bbox` - a `[ w, s, e, n ]` bbox array to use for limiting search results.
  Only features inside the provided bbox will be included.

### index(from, to, pointer, callback)

Indexes docs using `from` as the source and `to` as the destination. Options can
be passed to `pointer` or omitted.

### analyze(source, callback)

Analyze index relations for a given source. Generates stats on degenerate terms,
term => phrase relations, etc.

### copy(from, to, callback)

Copy an index wholesale between `from` and `to`.
