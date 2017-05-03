var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Tests New York (place), New York (region), USA (country)
// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature
var conf = {
    country: new mem({ maxzoom: 6, geocoder_languages: ['en'] }, () => {}),
    region: new mem({ maxzoom: 6, geocoder_languages: ['en'] }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_languages: ['en'], geocoder_inherit_score: true }, () => {})
};

var c = new Carmen(conf);

tape('index country', (t) => {
    queueFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1000000,
            'carmen:text':'usa',
            'carmen:text_en':'usa'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index country', (t) => {
    queueFeature(conf.country, {
        id: 2,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 10,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('index region', (t) => {
    queueFeature(conf.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 50,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index place', (t) => {
    queueFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 1,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('build queued features', (t) => {
    var q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('find georgia', (t) => {
    c.geocode('georgia', {}, (err, res) => {
        t.equal(res.features[0].id, 'region.1');
        t.equal(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

