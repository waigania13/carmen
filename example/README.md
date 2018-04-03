# Example Project

This example project is meant to serve as a tutorial for using the carmen API in a node application.

## Install

```
yarn install
```

## Run

```
node index.js
```

## Introduction

Geocoding is a specialized kind of search. Search solutions always have two basic high-level elements:

- **Documents:** Small chunks of information, each describing something important in the world. Relevant documents are returned in response to users' queries.
- **Queries:** User-submitted requests to recieve documents. Queries are meant to express the user's interest in a subset of documents, which are returned to them, ranked by their relevance.

In the common case of web search, the documents are webpages, and the queries are short strings of key words entered into a query interface like DuckDuckGo.

[diagram of web search]

In geocoding the documents contain information about aspects of the physical world, including their location, shape, and any names that human beings have bestowed upon them. When querying those documents, the user wants to recieve results that describe a particular location. This is called a **FORWARD** search.

[diagram of forward search]

One thing that makes geocoding a special type of search is that, because the documents are describe locations in the real world, an earthbound user is always standing at a point that is described by one or many documents. That's why it's also possible to do a **REVERSE** search.

[diagram of reverse search]

## Using the API

Carmen is a library that does two things:

1. Processes collections of documents (geojson Features) into efficient indexes.
2. Provides and interface for submitting both forward and reverse queries to those indexes.

### Initialize geocoder

To instantiate a new geocoder, you'll need to pass an index configuration object, which maps from index names to carmen source objects. Carmen source objects must satisfy the requirements of the tilelive [`Tilesource`](https://github.com/mapbox/tilelive/blob/master/API.md) API. An easy way to get started is to use [`MemSource`]('../docs/api.md#memsource'). Let's set up a geocoder that has address, place and point-of-interest (POI) indexes:

```javascript
const Carmen = require('@mapbox/carmen');
const MemSource = require('@mapbox/carmen/lib/api-mem');

const indexes = {
    address : new MemSource({maxzoom: 6}, () => {}),
    place : new MemSource({maxzoom: 6}, () => {}),
    poi :  new MemSource({maxzoom: 6}, () => {})
};
const carmen = new Carmen(indexes);
```

### Add documents to indexes

Our documents are GeoJSON features. Expand these to see the full features used in the example:

<details>
<summary>Address: San Diego Avenue, Jenkintown, PA</summary>

```javascript
const sd_city = {
    "id": 1,
    "type": "Feature",
    "properties": {
        "carmen:text": "San Diego",
        "carmen:center": [-117.148, 32.7311]
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[ -117.35595703124999, 32.55607364492026 ],[ -116.90277099609374, 32.55607364492026 ],[ -116.90277099609374, 33.07658322673801 ],[ -117.35595703124999, 33.07658322673801 ],[ -117.35595703124999, 32.55607364492026 ]]]
    }
}
```

</details>

<details>
<summary>Place: San Diego, CA</summary>

```javascript
const sd_street = {
  "id": 2,
  "type": "Feature",
  "properties": {
    "carmen:rangetype": "tiger",
    "carmen:parityl": [["E"]],
    "carmen:lfromhn": [[500]],
    "carmen:ltohn": [[600]],
    "carmen:parityr": [["O"]],
    "carmen:rfromhn": [[501]],
    "carmen:rtohn": [[601]],
    "carmen:text": "San Diego Avenue",
    "carmen:center": [ -75.095875, 40.085907 ]
  },
  "geometry": {
    "type": "GeometryCollection",
    "geometries": [
      {
        "type":"MultiLineString",
        "coordinates":[[[-75.093657,40.085796],[-75.095136,40.085792],[-75.096206,40.085754],[-75.097004,40.086226]]]
      }
    ]
  }
}
```

</details>

<details>
<summary>POI: San Diego Model Railroad Museum</summary>

```javascript
const sd_museum = {
    "id": 3,
    "type": "Feature",
    "properties": {
        "carmen:text": "San Diego Model Railroad Museum",
        "carmen:center": [ -117.148, 32.7311 ]
    },
    "geometry": {
        "type": "Point",
        "coordinates": [ -117.148, 32.731 ]
    }
}
```

</details>

We can add them to indexes using the `addFeature` module. To queue documents for indexing, call `queueFeature`. Once all of the documents for a an index are queued, use `buildQueued` to build the index. In this example, each index is just getting one document, for simplicity. The second argument to `queueFeature` can also be an iterable of many documents, or it can be called multiple times before calling `buildQueued`.

```javascript
const { queueFeature, buildQueued } = require('@mapbox/carmen/lib/util/addfeature');
const queue = require('d3-queue').queue;

let q = queue();

q.defer((cb) => {
    queueFeature(indexes.place, sd_city, () => {
        buildQueued(indexes.place, cb);
    });
})

q.defer((cb) => {
    queueFeature(indexes.address, sd_street, () => {
        buildQueued(indexes.address, cb);
    });
})

q.defer((cb) => {
    queueFeature(indexes.poi, sd_museum, () => {
        buildQueued(indexes.poi, cb);
    });
})
```

### Querying indexes

Once the indexes are built, call the `geocode` function to query:

```javascript
q.awaitAll((err) => {
    if (err) throw err;
    carmen.geocode('San Diego', {}, (err, result) => {
        if (err) throw err;
        console.log('Forward search result:');
        console.log(JSON.stringify(result));
    });

    carmen.geocode('-117.148,32.7311', {}, (err, result) => {
        if (err) throw err;
        console.log('Reverse search result:');
        console.log(JSON.stringify(result));
    });
});
```

The output will be a GeoJSON `FeatureCollection` object, with each result stored as a `Feature` object in the `features` member.

<details>
<summary>Click to see output</summary>

```javascript
{
    "type":"FeatureCollection",
    "query":["san","diego"],
    "features":[
        {
            "id": "address.2",
            "type": "Feature",
            "place_type": ["address"],
            "relevance": 1,
            "properties": {},
            "text": "San Diego Avenue",
            "place_name": "San Diego Avenue",
            "center": [-75.095875,40.085907],
            "geometry": {
                "type":"Point",
                "coordinates":[-75.095875,40.085907]
            }
        },
        {
            "id": "place.1",
            "type": "Feature",
            "place_type": ["place"],
            "relevance": 1,
            "properties": {},
            "text": "San Diego",
            "place_name": "San Diego",
            "bbox": [-117.35595703124999,32.55607364492026,-116.90277099609374,33.07658322673801],
            "center":[-117.148,32.7311],
            "geometry":{
                "type":"Point",
                "coordinates":[-117.148,32.7311]
            }
        },
        {
            "id": "poi.3",
            "type": "Feature",
            "place_type": ["poi"],
            "relevance": 1,
            "properties": {},
            "text": "San Diego Model Railroad Museum",
            "place_name": "San Diego Model Railroad Museum, San Diego",
            "center": [-117.148,32.7311],
            "geometry": {
                "type":"Point",
                "coordinates":[-117.148,32.7311]
            },
            "context":[
                {"id":"place.1","text":"San Diego"}
            ]
        }
    ]
}
```

</details>

