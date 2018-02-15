# Data Sources

Data sources for carmen must be provided by a [tilelive.js](https://github.com/mapbox/tilelive) interface. Using one of the many already-available tilelive modules, vector tiles can be sourced from backend storage solutions like s3, postgis, mapbox and more. You can also implement your own interface, so long as it satisfies the interface requirements [specified for a Tilesource](https://github.com/mapbox/tilelive/blob/master/API.md).

See  [the data-sources API doc](./docs/data-sources.md) for more detail about carmen's extensions on the tilelive base class.

# Data Sources

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

## Example Features

### Polygon Example

```JSON
{
  "id": 4,
  "type": "Feature",
  "properties": {
    "carmen:text": "India",
    "iso2": "IN",
    "name": "India",
    "population": 1166079217,
    "carmen:center": [
      80.22679613492177,
      21.785546732636085
    ]
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [
          67.50144828884673,
          36.59644084422347
        ],
        [
          101.24855171115327,
          36.59644084422347
        ],
        [
          101.24855171115327,
          5.617434108002064
        ],
        [
          67.50144828884673,
          5.617434108002064
        ],
        [
          67.50144828884673,
          36.59644084422347
        ]
      ]
    ]
  }
}
```

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

Here's an example:

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

