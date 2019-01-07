// Test score handling across indexes
'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// simpleConfirm that disabling autocomplete works, and that in situations where an autocomplete
// result scores highest, the winner changes depending on whether or not autocomplete is enabled
const simpleConf = {
    poi: new mem({
        maxzoom: 6,
        geocoder_tokens: {
            'Street': 'St',
            'Station': 'Stn',
            'Fort': 'Ft',
        }
    }, () => {})
};
const simple = new Carmen(simpleConf);
const pois = [
    {
        id:1,
        properties: {
            'carmen:score': 100,
            'carmen:text': '30th Street Station',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    },
    {
        id:2,
        properties: {
            'carmen:score': 100,
            'carmen:text': 'Fort Wayne Stadium',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    },
    {
        id:3,
        properties: {
            'carmen:score': 100,
            'carmen:text': 'Ft Sumpter Museum',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    },
    {
        id:4,
        properties: {
            'carmen:score': 100,
            'carmen:text': 'Fortenberry Coffee',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    }
];

tape('simple indexing', (t) => {
    queueFeature(simpleConf.poi, pois, (err) => {
        buildQueued(simpleConf.poi, () => {
            t.end();
        });
    });
});

tape('30th st', (t) => {
    simple.geocode('30th st', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '30th Street Station', '30th street station matches by autocomplete');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('30th stn', (t) => {
    simple.geocode('30th stn', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '30th Street Station', '30th street station matches by stn -> st fuzzy');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.assert(res.features[0].relevance < 1, 'relevance < 1');
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('30th street', (t) => {
    simple.geocode('30th street', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '30th Street Station', '30th street station matches by autocomplete with replacement');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('30th station', (t) => {
    simple.geocode('30th station', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('30th strete', (t) => {
    simple.geocode('30th strete', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '30th Street Station', '30th street station matches by fuzzy then replacement then autocomplete');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.assert(res.features[0].relevance < 1, 'relevance < 1');
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('30th stre', (t) => {
    simple.geocode('30th stre', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, '30th Street Station', '30th street station matches by partial-word replacement then autocomplete');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.assert(res.features[0].relevance === 1, 'relevance = 1');
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('fo', (t) => {
    simple.geocode('fo', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fort Wayne Stadium', 'Fortenberry Coffee', 'Ft Sumpter Museum'],
            'found all ft/fo* things for fo'
        );
        t.end();
    });
});

tape('fort', (t) => {
    simple.geocode('fort', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fort Wayne Stadium', 'Fortenberry Coffee', 'Ft Sumpter Museum'],
            'found all ft/fo* things for fort'
        );
        t.end();
    });
});

tape('ft', (t) => {
    simple.geocode('ft', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fort Wayne Stadium', 'Ft Sumpter Museum'],
            'found only ft/fort things for ft'
        );
        t.end();
    });
});

tape('fo', (t) => {
    simple.geocode('fo', { autocomplete: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            [],
            'found nothing for fo without autocomplete'
        );
        t.end();
    });
});

tape('fort', (t) => {
    simple.geocode('fort', { autocomplete: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            [],
            'found nothing for fort without autocomplete'
        );
        t.end();
    });
});

tape('forte', (t) => {
    simple.geocode('forte', { fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fort Wayne Stadium', 'Fortenberry Coffee', 'Ft Sumpter Museum'],
            'found everything if we can still fuzzy-match to fort'
        );
        t.end();
    });
});

tape('forp', (t) => {
    simple.geocode('forp', { fuzzyMatch: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fort Wayne Stadium', 'Ft Sumpter Museum'],
            'found only fort/ft if we fuzzy match'
        );
        t.end();
    });
});

tape('forten', (t) => {
    simple.geocode('forten', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features.map((f) => f.place_name).sort(),
            ['Fortenberry Coffee'],
            'found only fortenberry if too long to fuzzy-match'
        );
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
