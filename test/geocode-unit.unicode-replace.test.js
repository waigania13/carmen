// Ensures that token replacement casts a wide (unidecoded) net for
// left-hand side of token mapping.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    test: new mem({
        geocoder_tokens: {
            'Maréchal': 'Mal'
        },
        maxzoom:6
    }, () => {})
};
var c = new Carmen(conf);
tape('index Maréchal', (t) => {
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'Maréchal',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => { buildQueued(conf.test, t.end) });
});
tape('Mal => Maréchal', (t) => {
    c.geocode('Mal', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('Maréchal => Maréchal', (t) => {
    c.geocode('Maréchal', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('Marechal => Maréchal', (t) => {
    c.geocode('Marechal', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

