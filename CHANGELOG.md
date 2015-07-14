# Changelog

## 4.0.0

- Large refactor of carmen index structure and indexing/runtime processes. See https://github.com/mapbox/carmen/pull/287

## 3.1.6

- Rollback XRegExp use.

## 3.1.5

- Move `addfeature.js` from test directory to lib for external testing use.

## 3.1.4

- Fix for max call stack errors when using grid indexes with high cardinality.

## 3.1.3

- Extend geocoder_tokens to use XRegExp.

## 3.1.2

- Pin to node-mapnik 3.2.x until mapnik 3.3.x is ready.

## 3.1.1

- Allow geocoder_tokens to be expressed as explicit regex patterns.

## 3.1.0

- Include ghost features if queried for explicitly.

## 3.0.9

- Proximity fixes.

## 3.0.8

- Proximity fixes.

## 3.0.7

- Prioritizes layer type + score consistently across proximity/non-proximity mode.

## 3.0.6

- Additional sort stabilization at verifymatch stage.

## 3.0.5

- Improvements to result stability in proximity mode.

## 3.0.4

- Use single closest degen for non-terminal terms.
- Update to carmen-cache@0.4.1 with support for swapped order setRelevance.

## 3.0.3

- Snap dataterm min/max values to nearest thousand. Reduces cardinality of phrase index with minimal affect on dataterm accuracy at querytime.

## 3.0.2

- Use cache#loadall when indexing.

## 3.0.1

- Added cache#loadall for loading shards without retrieving results.

## 3.0.0

- Improved suggestion/autocomplete support for partial queries.
- **Breaking change:** Introduces `dataterm` term ID type. Any carmen indexes generated previously that contained numeric text (e.g. US zipcodes or addresses with housenumbers) need to be reindexed using carmen@3.x.

