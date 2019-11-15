# Tests

Carmen has two main jobs - one is to index our data and the other one is to search for a feature through our indexes given a query. The [README.md](../README.md) covers how carmen creates a geocoder instance and returns a feature to the user in a number of steps.

Carmen is constantly being improved and the way to make sure that any additional functionality is not going to break anything, is by writing tests. In carmen we write [unit tests](https://en.wikipedia.org/wiki/Unit_testing), and [acceptance tests](https://en.wikipedia.org/wiki/Acceptance_testing).

## Test Categories
### Unit test
> Unit testing is a software testing method by which individual units of source code, sets of one or more computer program modules together with associated control data, usage procedures, and operating procedures, are tested to determine whether they are fit for use.

Unit tests in carmen are written to test whether individual functions in a file perform consistently, or to check whether changes to a file doesn't break one or more functions within that file. An example for a unit test in carmen can be seen in [context.test.js](./unit/geocoder/context.test.js) where functions in [context.js](../lib/geocoder/context.js) have been tested in the file by supplying an input for every function and asserting the output of every option. For example, [contextVector()](../lib/geocoder/context.js#L385) loads a representative tile, and if we find a feature, add it to the `context` array in a way that represents it in imaginary z-space (country, town, place, etc).

```
// from context.test.js

context.contextVector(source, 0, 0, false, { 2:true }, null, false, false, (err, data) => {
	t.ifError(err);
	t.equal(data.properties['carmen:text'], 'B');
	t.end();
});

```
### Acceptance tests
>In engineering and its various subdisciplines, acceptance testing is a test conducted to determine if the requirements of a specification or contract are met.

Acceptance tests in carmen are written in carmen treating carmen as a black box. The input is the query you want to test and you assert whether the values returned are what is expected of carmen. For example, in the following [proximity test](./acceptance/geocode-unit.proximity.test.js#L97) we notice that the input is a string, while the proximity options ([see options.proximity in geocode](../docs/api.md#geocode)) of carmen accepts an array of longitude and latitude, in this case carmen should throw and error alerting the customer of the invalid input options. An acceptance test would typically look like this:


```
const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// api-mem is a tile-live source used for tests that
// satisfies the constraints - https://github.com/mapbox/tilelive/blob/master/API.md

const conf = {
    address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_format: '{{address.name}} {{address.number}}', geocoder_name:'address' }, () => {})
};

//instantiate a geocoder
const c = new Carmen(conf);

tape('index address', (t) => {
// indexes the data
    const address = {
        id:1,
        properties: {
            'carmen:text':'Brehmestraße',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['56']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

// perform a forward geocode given a query
// limit_verify is an option sent along with the query
tape('test address', (t) => {
    c.geocode('56 Brehmestr.', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0] && res.features[0].place_name, 'Brehmestraße 56');
        t.end();
    });
});

```
These tests follow the `geocode-unit.*` pattern of naming.

### Other

Since carmen is expected to do text processing and handle a number of languages, there are tests to cover the text processing idiosyncrasies of carmen. These tests follow the `termops.*` pattern of naming. For example: `termops.id.test.js`.

## Navigating tests

As mentioned above, carmen has two jobs - indexing our data and retrieving a feature given a query. Navigating tests for finding the right test to run to see a behaviour can be slightly intimidating, so here are a few helpful tips to help you get started:

### Indexer tests
These are tests that check the indexing behaviour of carmen, which include [indexdocs.test.js](https://github.com/mapbox/carmen/blob/master/test/indexdocs.test.js), [index.bbox.test.js](https://github.com/mapbox/carmen/blob/master/test/index.bbox.test.js), [index.merge.test.js](https://github.com/mapbox/carmen/blob/master/test/index.merge.test.js), [index.merge-norm.test.js](https://github.com/mapbox/carmen/blob/master/test/index.merge-norm.test.js), [index.multimerge.test.js](https://github.com/mapbox/carmen/blob/master/test/index.multimerge.test.js), [indexdocs.parseDocs.test.js](https://github.com/mapbox/carmen/blob/master/test/indexdocs.parseDocs.test.js).

### Geocoder Test
These tests check carmen's forward and reverse geocoding behaviour, some tests also cover the [options](https://github.com/mapbox/carmen/blob/master/docs/api/carmen.md#geocodequery-options-callback) sent with the query like limit, proximity, bbox, languageMode etc. Here are some of tests to run to get a sense of how carmen goes about forward and reverse geocoding.

- Forward - https://github.com/mapbox/carmen/blob/master/test/geocode-unit.relevance.test.js
- Reverse - https://github.com/mapbox/carmen/blob/master/test/geocode-unit.multitype-reverse.test.js
- Text-processing - https://github.com/mapbox/carmen/blob/master/test/termops.*

### Bench tests
Bench tests are used to check the speed of operations for different parts of carmen. These tests are run by [run_all_benchmarks.sh](https://github.com/mapbox/carmen/blob/master/test/run_all_benchmarks.sh) and the files that run these benchmarks can be found under the `/bench` directory in the carmen repository.
