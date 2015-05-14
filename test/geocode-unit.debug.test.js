//Test Carmen options.debug

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('./util/addfeature');

var conf = {
    country: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);
tape('index country', function(t) {
    var country = {
        _id:1,
        _text:'czech republic',
        _zxy:['6/32/32'],
        _center:[0,0]
    };
    addFeature(conf.country, country, t.end);
});
tape('index country2', function(t) {
    var country = {
        _id:2,
        _text:'fake country two',
        _zxy:['7/32/32'],
        _center:[0,0]
    };
    addFeature(conf.country, country, t.end);
});
tape('czech debug:1', function(t) {
    c.geocode('czech', { debug: 1, limit_verify:1 }, function(err, res) {
        t.ifError(err);
        if (process.env.UPDATE) fs.writeFileSync(__dirname + '/fixtures/debug-1a.json', JSON.stringify(res.debug, null, 2));
        t.deepEqual(res.debug, require('./fixtures/debug-1a.json'), 'debug matches');
        t.end();
    });
});

tape('czech republic debug:1', function(t) {
    c.geocode('czech republic', { debug: 1, limit_verify:1 }, function(err, res) {
        t.ifError(err);
        if (process.env.UPDATE) fs.writeFileSync(__dirname + '/fixtures/debug-1b.json', JSON.stringify(res.debug, null, 2));
        t.deepEqual(res.debug, require('./fixtures/debug-1b.json'), 'debug matches');
        t.end();
    });
});

tape('czech republic debug:3', function(t) {
    c.geocode('czech republic', { debug: 3, limit_verify:1 }, function(err, res) {
        t.ifError(err);
        if (process.env.UPDATE) fs.writeFileSync(__dirname + '/fixtures/debug-3a.json', JSON.stringify(res.debug, null, 2));
        t.deepEqual(res.debug, require('./fixtures/debug-3a.json'), 'debug matches');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

