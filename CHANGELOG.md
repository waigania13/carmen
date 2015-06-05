# Changelog

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

