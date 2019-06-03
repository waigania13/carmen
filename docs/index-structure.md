# Index structure

There several types of stores used in each Carmen index:

- `fuzzy-phrase` is used for storing all the phrases that occur as normalized labels for any feature in the index. Phrases are stored sorted lexicographically, and each phrase is assigned in ID corresponding to its lexicographical position. This index also supports fuzzy querying for fast spelling correction.
- `carmen-core` provides the `gridstore` structure, which maps from a tuple of a phrase ID and set of language IDs to a list of tuples of feature ID, spatial location, and relevance/score for each occurrence of that phrase in the index.
- `MBTiles` is a vector tile representation of all the features in the index, used for reverse geocoding, and for determining geospatial context in forward geocodes.
- `feature` is used to store full feature documents, and maps a feature ID and spatial location to each document.

## fuzzy-phrase

The [fuzzy-phrase](https://github.com/mapbox/fuzzy-phrase) library provides a space-efficient mapping from phrase text to phrase IDs that represents all phrases in an index as a set of interrelated finite state automata. It can efficiently perform exact lookups, prefix lookups for autocomplete queries (which return ranges of lexicographical IDs representing all phrases that begin with a given prefix, rather than exact IDs), fuzzy matches that find phrases within a given Damerau-Levenshtein distance, and windowed lookups that can search within a given query for occurrences of any phrase (exact, fuzzy, or prefix) that match any element in the store. For more information on the structure of this store, see its README.

## carmen-core gridstore

The [carmen-core](https://github.com/mapbox/carmen-core) library provides the `gridstore` structure, which stores a mapping of phrase IDs and language metadata to spatial occurrences of that phrase (hereinafter "grids").

    [phrase_id, language_set] => [ grid, grid, grid, grid ... ]

The phrase ID is as supplied by `fuzzy-phrase`. The language set is the list of the IDs of all languages for which the given label is a valid descriptor of the features in the grid list (for example, the phrase "londres" is a valid descriptor of London in French but not English). Internally this is represented as a 128-bit bitfield, but it's exposed as an array of language IDs to and from Javascript. Language ID 0 is conventionally used as the default language ("carmen:text"). Mappings from other languages to language IDs are the responsibility of Carmen.

A lookup against this index effectively answers the question: what and where are all the features that match (whole or partially) a given text phrase?

Grids are encoded representations of the following information:

| info               | bits | description |
| -------------------|------|-------------|
| x                  | 14   | x tile cover coordinate, up to z14 |
| y                  | 14   | y tile cover coordinate, up to z14 |
| relev              | 2    | relev between 0.4 and 1.0 (possible values: 0.4, 0.6, 0.8, 1.0) |
| score              | 3    | score scaled to a value between 0-7 |
| id                 | 20   | feature id, truncated to 20 bits |
| source_phrase_hash | 8    | one-byte extract of a hash of the original phrase on this feature that was normalized into the current phrase |

Internally, the `gridstore` uses a RocksDB database to store its data, with each key being a binary representation of the composite of the phrase ID and 128-bit language set, and each value being a nested structure that deduplicates fields across adjacent entries, stored using a custom [FlatBuffers](https://google.github.io/flatbuffers/) schema.

## MBTiles

Each index also includes a vector-tile representation of all features within the index, in MBTiles format. This representation is used in reverse geocodes for efficiently finding the nearest features at each level in the hierarchy to the user's query point, as well as for filling in elements of a result's geospatial context in forward queries. Carmen itself has tooling for generating these tiles, or then can be generated with an external tool such as `tippecanoe`.

## feature

Each feature is stored, keyed by feature ID, gzip-compressed in an extra table in the index's MBTiles file. Full features are retrieved at a late phase in querying, and used for creating final content to be returned to users, for filling in geospatial contexts, and for extrapolating specific special locations for individual matches within complex features (for example, for performing address interpolation).


## geocoder_name, geocoder_type and combining indexes

It is often useful to use multiple indexes to represent a single class of feature. For instance, you might have indexes named `usa-address` and `canada-address`. Such indexes can be grouped together into a combined class of indexes (e.g. `address`) by setting those indexes' `geocoder_name` value to `address`.

It can be desirable to combine indexes using `geocoder_name` but still make them distinguishable by type filtering. For instance, the above `address` grouped index might be accompanied by a point of interest (POI) index, in which case it would be desirable to avoid returning both a POI (e.g. "White House") and a duplicative address feature (e.g. "1600 Pennsylvania Avenue"). This can be achieved by grouping the indexes together using `geocode_name`, as already described.

However, it might _also_ be desirable to distinguish results from these indexes for purposes of filtering and identifying the class of feature in results' `id` field. This distinction can be accomplished by setting `geocoder_type` value of individual indexes that have been grouped with `geocoder_name`. In the above example, the POI and address indexes might share a `geocoder_name` of `address`, but the POI index could have a `geocoder_type` of `poi`.

## type and subtype filtering

The `types` parameter allows query results to be limited to specific classes of features as defined with `geocoder_name`. Using the above example, `address` and `poi` would be valid type filter values.

Subtype filtering allows results from an index to be limited to its highest-scoring members. This can be a useful way of ensuring that queries highlight features of highest importance. For instance, a carsharing company might assign `city` features scores that are assigned in two numeric ranges: cities where the company operates (`current`), and where it has no presence (in descending order). Within each range, features could then be scored by city population, car ownership rates or some other metric. Given a situation like this, and assuming the numeric score ranges are of equal size, a `scoreranges` value on the index tileJSON's `metadata` object could be specified like:

```js
"geocoder_name": "city",
"scoreranges": {
  "operational": [
    0.5,
    1.0
  ]
}
```

With a configuration like this, valid type filters will include `city` and `city.operational`. Specifying both will return the union of features (i.e. it will operate the same way as simply specifying `city`).

The ability to specify more than one score range per index has not yet been implemented.

### multitype features

The `carmen:types` property of a feature allows it to shift between different types while being stored in one source.

```js
{
  "type": "Feature",
  "properties": {
    "carmen:text": "Sparta",
    "carmen:types": [ "country", "city" ]
  }
}
```

In this example the feature Sparta can be returned as either a `country` feature or a `city` feature. Types should be listed in order of ascending preference (last is most preferred).

To use multitype features properly, make sure to set the `geocoder_types` key of the source so that the source is not prematurely excluded from queries when the `types` filter is used.

