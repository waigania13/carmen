const Carmen = require('@mapbox/carmen');
const MemSource = require('@mapbox/carmen/lib/api-mem');


/* To instantiate a new geocoder, you'll need to pass an index configuration
 * object, which maps from index names to carmen source objects. Carmen source
 * objects must satisfy the requirements of the tilelive
 * [`Tilesource`](https://github.com/mapbox/tilelive/blob/master/API.md) API.
 * An easy way to get started is to use [`MemSource`]('./lib/api-mem.js').
 * Let's set up a geocoder that has address, place and point-of-interest (POI)
 * indexes
 */

const indexes = {
    address : new MemSource({maxzoom: 6}, () => {}),
    place : new MemSource({maxzoom: 6}, () => {}),
    poi :  new MemSource({maxzoom: 6}, () => {})
};
const carmen = new Carmen(indexes);

/*
 * Our documents are GeoJSON features
 */

const sd_city = require('./data/san-diego_city.json');
const sd_street = require('./data/san-diego_street.json');
const sd_museum = require('./data/san-diego_museum.json');

/*
 * We can add them to indexes using the `addFeature` module. To queue
 * documents for indexing, call `queueFeature`. Once all of the documents for
 * a an index are queued, use `buildQueued` to build the index. In this
 * example, each index is just getting one document, for simplicity. The
 * second argument to `queueFeature` can also be an iterable of many
 * documents, or it can be called multiple times before calling `buildQueued`.
 */

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

/*
 * ### Querying indexes
 *
 * Once the indexes are built, call the `geocode` function to query:
 */

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
