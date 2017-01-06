// Test combining feature results from multiple carmen shards

var tape = require('tape');
var queue = require('d3-queue').queue;
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var combineResults = require('../lib/combineShardResults');
var addFeature = require('../lib/util/addfeature');


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
    addFeature(confA.country, countryAtuanA, t.end);
});
tape('index Atuan Street - address', function(t) {
    var addressAtuanA = {
        id:2,
        properties: {
            'carmen:score': 1500,
            'carmen:text':'Atuan Street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[158,-8]
        }
    };
    addFeature(confA.address, addressAtuanA, t.end);
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
    addFeature(confA.poi, poiAtuanTempleA, t.end);
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
    addFeature(confA.poi, poiAtuanTombsA, t.end);
});

// features for carmen B
tape('index Atuan Ring Road - address', function(t) {
    var addressAtuanRingRoadB = {
        id:2,
        properties: {
            'carmen:score': 200,
            'carmen:text':'Atuan Ring Road',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[151,-11]
        }
    };
    addFeature(confB.address, addressAtuanRingRoadB, t.end);
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
    addFeature(confB.poi, poiAtuanLabyrinthB, t.end);
});
tape('index Atuan Ring - poi', function(t) {
    var poiAtuanRingB = {
        id:4,
        properties: {
            'carmen:score': 10,
            'carmen:text':'Atuan Ring',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[153,-13]
        }
    };
    addFeature(confB.poi, poiAtuanRingB, t.end);
});

tape('check for Atuan', function(t) {
    carmenA.geocode('poi.4', null, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Atuan Tombs', 'Finds Atuan - POI');
        t.end();
    });
});


tape('sort shards', function(t) {
    // geocode for atuan
    var q = queue(2);
    var results = [];

    // binds `this` context to carmenA so it survives deferring
    // q.defer(carmenA.geocode.bind(carmenA), 'Atuan', null);

    // also works
    q.defer(function(cb) {
        carmenA.geocode('Atuan', null, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.defer(function(cb) {
        carmenB.geocode('Atuan', null, function(err, res) {
            if (err) throw err;
            cb(null, res);
        });
    });

    q.awaitAll(function(err, items) {
        if (err) throw err;
        // pass results to combineResults
        var combinedResults = combineResults(items);
        // get back new, tidy featureCollection
        console.log('combined results:', JSON.stringify(combinedResults, null, 2));
        t.end();
    });

})

tape('teardown', function(t) {
    context.getTile.cache.reset();
    t.end();
});

