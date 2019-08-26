# Address Data

Although carmen is designed to serve as a data agnostic spatial search engine, one of the primary
use cases is to load address data into the engine. As such, some concessions have been made
in our data format for the optimization searching address data, that are not applicable
for other layers of spatial data.  This document will serve as a guideline
for describing the expected format of address data as well as pitfalls you may encounter.

This document assumes that you have already read the generic [Data Sources](./docs/data-sources.md)
document.

The document is broken into two sections, firstly the expected format of features within a given
index, and secondly, useful configuration options to use when configuring and deploying an address
index.

## Address Features

### Address Points

```JSON
{
    "id": 4914387757785060
    "type": "Feature",
    "properties": {
        "carmen:addressnumber": [
            "600",
            "601",
            "602",
            "603",
            "604",
            ],
            "carmen:text": "Galveston Street Southeast,US Highway 110",
            "carmen:geocoder_stack": "us",
            "carmen:center": [ -76.9989961, 38.8235612 ],
    },
    "geometry": {
        "type": "MultiPoint",
        "coordinates": [
            [ -76.9994694, 38.8240466 ],
            [ -76.9994929, 38.8237324 ],
            [ -76.9994077, 38.82405 ],
            [ -76.9994363, 38.8237197 ],
            [ -76.9993205, 38.8240264 ],
        ]
    }
}

```

### Interpolation Lines

### Intersections

### Putting it all together

## Index Feateures

