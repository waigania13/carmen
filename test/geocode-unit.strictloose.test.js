// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    country: new mem(null, () => {}),
    province: new mem(null, () => {}),
    place: new mem(null, () => {})
};
var c = new Carmen(conf);
tape('index country', (t) => {
    queueFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text':'australia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index province', (t) => {
    queueFeature(conf.province, {
        id:2,
        properties: {
            'carmen:text':'western australia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index place', (t) => {
    queueFeature(conf.place, {
        id:3,
        properties: {
            'carmen:text':'albany',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
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

// should reflect relevance of albany + australia (relev ~ 1), not albany + western australia (relev ~ 0.8)
tape('albany australia', (t) => {
    c.geocode('albany australia', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'albany, western australia, australia');
        t.deepEqual(res.features[0].relevance, 0.999);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

