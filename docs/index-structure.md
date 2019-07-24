# Index structure

There are two types of index stores in Carmen.

- `gridstore` is used for storing the `grid` index.
  Each index is sharded and each shard contains a one-to-many
  hash with 64-bit integer keys that map to arrays of arbitrary length
  containing 64-bit integer elements.
- `feature` is used to store feature docs. Each index is sharded and each shard
  contains a one-to-many hash with 32-bit integer keys that map to a bundle of
  features. Each bundle contains feature documents keyed by their original, full
  id.

Unsigned integers are widely used in the Carmen codebase because of their
performance and memory efficiency. To convert arbitrary text (like tokenized
text) to integers the murmur hash is used and sometimes truncated to make room
for additional encoded data.

## freq

Stores a mapping of term frequencies for all docs in an index. Terms are ID'd using a [`murmur`](https://en.wikipedia.org/wiki/MurmurHash) hash.

    term_id => [ count ]

Conceptual exapmle with actual text rather than `murmur` hashes for readability:

    street => [ 103120 ]
    main   => [ 503 ]
    market => [ 31 ]

## grid

Stores a mapping of phrase/phrase degenerate to feature cover grids.

    phrase_id => [ grid, grid, grid, grid ... ]

A lookup against this index effectively answers the question: what and where are all the features that match (whole or partially) a given text phrase?

Grids are encoded as 53-bit integers (largest possible JS integer) storing the following information:

info | bits | description
---- |------|------------
x    | 14   | x tile cover coordinate, up to z14
y    | 14   | y tile cover coordinate, up to z14
relev| 2    | relev between 0.4 and 1.0 (possible values: 0.4, 0.6, 0.8, 1.0)
score| 3    | score scaled to a value between 0-7
id   | 20   | feature id, truncated to 20 bits

## phrase_id

phrase | degen
------ |------
51-1   | 0

The first 51 bits of a phrase ID are the `murmur` hash of the phrase text. The last remaining bit is used to store whether the `phrase_id` is for a complete or degenerate phrase.

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

