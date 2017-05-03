// Under certain conditions (feature with null or empty text) it will
// skip indexing but may still be rendered to a vector tile. Tests that
// these features miss loading but noop gracefully.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueVT = addFeature.queueVT,
    buildQueued = addFeature.buildQueued;

var conf = {
    a: new mem(null, () => {}),
};
var c = new Carmen(conf);
tape('index', (t) => {
    queueVT(conf.a, {
        id:1,
        properties: {
            'carmen:text':'\n',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => { buildQueued(conf.a, t.end) });
});
tape('reverse geocode', (t) => {
    c.geocode('0,0', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 0);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

