// Test combining feature results from multiple carmen shards

var tape = require('tape');
var queue = require('d3-queue').queue;
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var combineResults = require('../lib/combineShardResults');
var queryFixture = require('./fixtures/combineShards.json');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;


// initialize two carmen shards
var confA = {
    country: new mem(null, function() {}),
    address: new mem(null, function() {}),
    poi: new mem(null, function() {})
};
var confB = {
    address: new mem(null, function() {}),
    poi: new mem(null, function() {})
};

var carmenA = new Carmen(confA);
var carmenB = new Carmen(confB);

//features for carmenA
tape('index Atuan - country', function(t) {
    var countryAtuanA = {
        id:1,
        properties: {
            'carmen:score': 60000,
            'carmen:text':'Atuan',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[157,-7]
        }
    };
    queueFeature(confA.country, countryAtuanA, t.end);
});
tape('index Atuan Ring Road - address', function(t) {
    var addressAtuanA = {
        id:2,
        properties: {
            'carmen:score': 200,
            'carmen:text':'Atuan Ring Road',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[158,-8]
        }
    };
    queueFeature(confA.address, addressAtuanA, t.end);
});
tape('index Atuan Temple - poi', function(t) {
    var poiAtuanTempleA = {
        id:3,
        properties: {
            'carmen:score': 230,
            'carmen:text':'Atuan Temple',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[159,-9]
        }
    };
    queueFeature(confA.poi, poiAtuanTempleA, t.end);
});
tape('index Atuan Tombs - poi', function(t) {
    var poiAtuanTombsA = {
        id:4,
        properties: {
            'carmen:score': 100,
            'carmen:text':'Atuan Tombs',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[160,-10]
        }
    };
    queueFeature(confA.poi, poiAtuanTombsA, t.end);
});

// features for carmen B
tape('index Atuan Ring Road - address', function(t) {
    var addressAtuanRingRoadB = {
        id:2,
        properties: {
            'carmen:score': 200,
            'carmen:text':'Atuan Ring Road',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[158,-8]
        }
    };
    queueFeature(confB.address, addressAtuanRingRoadB, t.end);
});
tape('index Atuan Labyrinth - poi', function(t) {
    var poiAtuanLabyrinthB = {
        id:3,
        properties: {
            'carmen:score': 1000,
            'carmen:text':'Atuan Labyrinth',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[152,-12]
        }
    };
    queueFeature(confB.poi, poiAtuanLabyrinthB, t.end);
});
tape('index Atuan Ring - poi', function(t) {
    var poiAtuanRingB = {
        id:4,
        properties: {
            'carmen:score': 10,
            'carmen:text':'Atuan Ring',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[159,-10]
        }
    };
    queueFeature(confB.poi, poiAtuanRingB, t.end);
});

tape('build queued A features', function(t) {
    var q = queue();
    Object.keys(confA).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(confA[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('build queued B features', function(t) {
    var q = queue();
    Object.keys(confB).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(confB[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('check for Atuan - Forward', function(t) {
    carmenA.geocode('Atuan', null, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Atuan', 'Finds Atuan - forward');
        t.end();
    });
});

tape.skip('check for Atuan - ID', function(t) {
    carmenA.geocode('poi.4', null, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Atuan Tombs', 'Finds Atuan - id');
        t.end();
    });
});

tape('check for Atuan - Reverse', function(t) {
    carmenB.geocode('0,0', null, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Atuan Labyrinth, Atuan Ring Road', 'Finds Atuan - reverse');
        t.end();
    });
});

tape('sort shards', function(t) {
    // geocode for atuan
    var q = queue(2);
    var options = {
        stats: false,
        debug: false,
        allow_dupes: false,
        indexes: false,
        autocomplete: true,
        bbox: false,
        // falsely high limit to test deduping
        limit: 10,
        allowed_idx: { '0': true, '1': true },
        shard: true,
        attribution: 'NOTICE: © 2017 Kaibot3000 ⚑'
    }

    // binds `this` context to carmenA so it survives deferring
    // q.defer(carmenA.geocode.bind(carmenA), 'Atuan', options, null);

    // also works
    q.defer(function(cb) {
        carmenA.geocode('Atuan', options, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.defer(function(cb) {
        carmenB.geocode('Atuan', options, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.awaitAll(function(err, items) {
        if (err) throw err;

        var combinedResults = combineResults(items, options);

        var inScoreOrder = true;
        for (var j = 1; j < combinedResults.features.length; j++) {
            var current = combinedResults.features[j];
            var last = combinedResults.features[j-1];
            if ((current.score > last.score) && (current.relevance === last.relevance)) {
                console.log('score: %d > %d, r = %d', current.score, last.score, last.relevance);
                inScoreOrder = false;
                break;
            }
        }

        // testing
        t.deepEqual(combinedResults.features.length, 6, 'Dedupes features');
        t.deepEqual(inScoreOrder, true, 'Features sorted by score');
        t.end();
    });

})

tape('options.limit still limits number of total results', function(t) {
    // geocode for atuan
    var q = queue(2);
    var options = {
        stats: false,
        debug: false,
        allow_dupes: false,
        indexes: false,
        autocomplete: true,
        bbox: false,
        limit: 2,
        allowed_idx: { '0': true, '1': true },
        shard: true,
        attribution: 'NOTICE: © 2017 Kaibot3000 ⚑'
    };

    // q.defer(carmenA.geocode.bind(carmenA), 'Atuan', options, null);
    // q.defer(carmenA.geocode.bind(carmenA), 'Atuan', options, null);

    // also works
    q.defer(function(cb) {
        carmenA.geocode('Atuan', options, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.defer(function(cb) {
        carmenB.geocode('Atuan', options, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.awaitAll(function(err, items) {
        if (err) throw err;
        var combinedResults = combineResults(items, options);
        t.deepEqual(combinedResults.features.length, 2, 'respects result limit');
        t.end();
    });
});

tape('Shard combination works on real-world queries', function(t) {
    var options = {
        stats: false,
        debug: false,
        allow_dupes: false,
        indexes: false,
        autocomplete: true,
        bbox: false,
        limit: 5,
        allowed_idx: { '0': true, '1': true },
        shard: true,
        attribution: 'NOTICE: © 2017 Kaibot3000 ⚑'
    };
    var combinedResults = combineResults(queryFixture, options);
    t.deepEqual(combinedResults.features[0].place_name, 'California, United States', 'state of california first result');
    t.deepEqual(combinedResults.features.length, 5, 'limit works');
    t.end();
});


tape('teardown', function(t) {
    context.getTile.cache.reset();
    t.end();
});

