// Test score handling across indexes
'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// simpleConfirm that disabling autocomplete works, and that in situations where an autocomplete
// result scores highest, the winner changes depending on whether or not autocomplete is enabled
const simpleConf = { place: new mem(null, () => {}) };
const simple = new Carmen(simpleConf);
const pois = [
    {
        id:1,
        properties: {
            'carmen:score': 100,
            'carmen:text': 'Pinball Parlour Arcade',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    },
    {
        id:2,
        properties: {
            'carmen:score': 10,
            'carmen:text': 'Pinball Parlor Arcade',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    }
];

tape('simple indexing', (t) => {
    queueFeature(simpleConf.place, pois, (err) => {
        buildQueued(simpleConf.place, () => {
            t.end();
        });
    });
});

tape('parlor - without fuzzy', (t) => {
    simple.geocode('pinball parlor arcade', { limit_verify: 2, autocomplete: false, fuzzyMatch: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlor Arcade', 'Parlor wins without fuzzy');
        t.deepEqual(res.features[0].id, 'place.2');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.equal(res.features.length, 1, 'Parlor is only result');
        t.end();
    });
});
tape('parlor - with fuzzy', (t) => {
    simple.geocode('pinball parlor arcade', { limit_verify: 2, autocomplete: false, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlor Arcade', 'Parlor wins on relevance');
        t.deepEqual(res.features[0].id, 'place.2');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');

        t.deepEqual(res.features[1].place_name, 'Pinball Parlour Arcade', 'Parlour is in second place');
        t.deepEqual(res.features[1].id, 'place.1');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.end();
    });
});
tape('parloar - with fuzzy', (t) => {
    simple.geocode('pinball parloar arcade', { limit_verify: 2, autocomplete: false, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlour Arcade', 'Tied on relevance; parlour wins on score');
        t.deepEqual(res.features[0].id, 'place.1');
        t.assert(res.features[0].relevance < 1, 'relevance < 1');

        t.deepEqual(res.features[1].place_name, 'Pinball Parlor Arcade', 'Parlor is in second place');
        t.deepEqual(res.features[1].id, 'place.2');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.equal(res.features[0].relevance, res.features[1].relevance, 'Relevances are equal');
        t.end();
    });
});

tape('parlor - prefix without fuzzy', (t) => {
    simple.geocode('pinball parlor', { limit_verify: 2, autocomplete: true, fuzzyMatch: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlor Arcade', 'Parlor wins without fuzzy');
        t.deepEqual(res.features[0].id, 'place.2');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.equal(res.features.length, 1, 'Parlor is only result');
        t.end();
    });
});
tape('parlor - prefix with fuzzy', (t) => {
    simple.geocode('pinball parlor', { limit_verify: 2, autocomplete: true, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlor Arcade', 'Parlor wins on relevance');
        t.deepEqual(res.features[0].id, 'place.2');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');

        t.deepEqual(res.features[1].place_name, 'Pinball Parlour Arcade', 'Parlour is in second place');
        t.deepEqual(res.features[1].id, 'place.1');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.end();
    });
});
tape('parloar - prefix with fuzzy', (t) => {
    simple.geocode('pinball parloar arcade', { limit_verify: 2, autocomplete: true, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Pinball Parlour Arcade', 'Tied on relevance; parlour wins on score');
        t.deepEqual(res.features[0].id, 'place.1');
        t.assert(res.features[0].relevance < 1, 'relevance < 1');

        t.deepEqual(res.features[1].place_name, 'Pinball Parlor Arcade', 'Parlor is in second place');
        t.deepEqual(res.features[1].id, 'place.2');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.equal(res.features[0].relevance, res.features[1].relevance, 'Relevances are equal');
        t.end();
    });
});

const complexConf = {
    region: new mem({ maxzoom: 6 }, () => {}),
    place: new mem({ maxzoom: 6 }, () => {}),
    address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_name:'address' }, () => {})
};
const complex = new Carmen(complexConf);

// Place
tape('index place "Washington"', (t) => {
    const place = {
        id:105,
        properties: {
            'carmen:text': 'Washington',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    };
    queueFeature(complexConf.place, place, t.end);
});

// Address 1
tape('index address "Main St" in "Washington"', (t) => {
    const address = {
        id: 100,
        properties: {
            'carmen:text': 'Main St',
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32'],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(complexConf.address, address, t.end);
});

// Address 2
tape('index address "Maine St" in "Washington"', (t) => {
    const address = {
        id: 101,
        properties: {
            'carmen:text': 'Maine St',
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32'],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(complexConf.address, address, t.end);
});

// Place 2: Seattle
tape('index region DC', (t) => {
    const region = {
        id: 110,
        properties: {
            'carmen:text': 'DC',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    };
    queueFeature(complexConf.region, region, t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(complexConf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(complexConf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('100 main st washington dc - without fuzzy', (t) => {
    complex.geocode('100 Main St washington dc', { limit_verify: 2, autocomplete: true, fuzzyMatch: false, types: ['address'] }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '100 Main St, Washington, DC', '100 Main St');
        t.deepEqual(res.features[0].id, 'address.100');
        console.log(res.features[0].relevance);
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.assert(res.features.length === 1, '1 feature returned');
        t.end();
    });
});


tape('100 main st washington dc - with fuzzy', (t) => {
    complex.geocode('100 Main St washington dc', { limit_verify: 2, autocomplete: true, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '100 Main St, Washington, DC', '100 Main St');
        t.deepEqual(res.features[0].id, 'address.100');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');

        t.deepEqual(res.features[1].place_name, '100 Maine St, Washington, DC', '101 Maine St');
        t.deepEqual(res.features[1].id, 'address.101');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.assert(res.features.length === 2, '2 features returned');
        t.end();
    });
});

tape('100 main st warshington dc - with fuzzy', (t) => {
    complex.geocode('100 Main St warshington dc', { limit_verify: 2, autocomplete: true, fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '100 Main St, Washington, DC', '100 Main St');
        t.deepEqual(res.features[0].id, 'address.100');
        t.assert(res.features[0].relevance < 1, 'relevance < 1');

        t.deepEqual(res.features[1].place_name, '100 Maine St, Washington, DC', '101 Maine St');
        t.deepEqual(res.features[1].id, 'address.101');
        t.assert(res.features[1].relevance < 1, 'relevance < 1');

        t.assert(res.features[1].relevance < res.features[0].relevance, 'more typos = worse relevance');
        t.assert(res.features.length === 2, '2 features returned');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
