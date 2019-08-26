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

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:rangetype": "tiger",
        "carmen:parityl": [ "E" ],
        "carmen:lfromhn": [ 600 ],
        "carmen:ltohn": [ 640 ],
        "carmen:parityr": [ "O" ],
        "carmen:rfromhn": [ 601 ],
        "carmen:rtohn": [ 631 ],
        "carmen:text": "Galveston Street Southeast,US Highway 123",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ],
    },
    "geometry": {
        "type": "MultiLineString",
        "coordinates": [[
            [ -76.999688, 38.823922 ],
            [ -76.999632, 38.823914 ],
            [ -76.99948, 38.823887 ],
            [ -76.999408, 38.823872 ],
            [ -76.999227, 38.823828 ],
            [ -76.999197, 38.823822 ],
            [ -76.99914, 38.823808 ],
            [ -76.999111, 38.8238 ],
            [ -76.999027, 38.823773 ],
            [ -76.998946, 38.823741 ],
            [ -76.998876, 38.823707 ],
            [ -76.998809, 38.823669 ],
            [ -76.998766, 38.823643 ],
            [ -76.998724, 38.823615 ],
            [ -76.998588, 38.823505 ],
            [ -76.9985091, 38.8234421 ]
        ]]
    }
}
```

### Intersections

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:intersections": [
            "6th Street Southeast",
            "Southern Avenue Southeast"
        ],
        "carmen:text": "Galveston Street Southeast",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ]
    },
    "geometry": {
        "type": "MultiPoint",
        "coordinates": [
            [ -76.999688, 38.823922 ],
            [ -76.9985091, 38.8234421 ]
        ]
    }
}
```

### Putting it all together

```JSON
{
    "id": 4914387757785060,
    "type": "Feature",
    "properties": {
        "carmen:intersections": [
            null,
            null,
            [
                "6th Street Southeast",
                "Southern Avenue Southeast"
            ]
        ],
        "carmen:addressnumber": [
            null,
            [
                "600",
                "601",
                "602",
                "603",
                "604",
            ],
            null
        ],
        "carmen:rangetype": "tiger",
        "carmen:parityl": [
            [
                "E"
            ],
            null,
            null
        ],
        "carmen:lfromhn": [
            [
                600
            ],
            null,
            null
        ],
        "carmen:ltohn": [
            [
                640
            ],
            null,
            null
        ],
        "carmen:parityr": [
            [
                "O"
            ],
            null,
            null
        ],
        "carmen:rfromhn": [
            [
                601
            ],
            null,
            null
        ],
        "carmen:rtohn": [
            [
                631
            ],
            null,
            null
        ],
        "carmen:text": "Galveston Street Southeast",
        "carmen:geocoder_stack": "us",
        "carmen:center": [ -76.9989961, 38.8235612 ],
    },
    "geometry": {
        "type": "GeometryCollection",
        "geometries": [{
            "type": "MultiLineString",
            "coordinates": [[
                [ -76.999688, 38.823922 ],
                [ -76.999632, 38.823914 ],
                [ -76.99948, 38.823887 ],
                [ -76.999408, 38.823872 ],
                [ -76.999227, 38.823828 ],
                [ -76.999197, 38.823822 ],
                [ -76.99914, 38.823808 ],
                [ -76.999111, 38.8238 ],
                [ -76.999027, 38.823773 ],
                [ -76.998946, 38.823741 ],
                [ -76.998876, 38.823707 ],
                [ -76.998809, 38.823669 ],
                [ -76.998766, 38.823643 ],
                [ -76.998724, 38.823615 ],
                [ -76.998588, 38.823505 ],
                [ -76.9985091, 38.8234421 ]
            ]]
        },{
            "type": "MultiPoint",
            "coordinates": [
                [ -76.9994694, 38.8240466 ],
                [ -76.9994929, 38.8237324 ],
                [ -76.9994077, 38.82405 ],
                [ -76.9994363, 38.8237197 ],
                [ -76.9993205, 38.8240264 ],
            ]
        },{
            "type": "MultiPoint",
            "coordinates": [
                [ -76.999688, 38.823922 ],
                [ -76.9985091, 38.8234421 ]
            ]
        }]
    }
}
```

## Index Features

