var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');

var conf = {};
for (var i = 0; i < 100; i++) {
    conf['place-'+i] = new mem({ maxzoom: 6 }, function() {});
}

var c = new Carmen(conf);
tape('rejects a heavy emoji query quickly', function(t) {
    var start = +new Date();
    c.geocode(decodeURIComponent('%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82'), {}, function(err, res) {
        t.ifError(err);
        t.equal(+new Date() - start < 50, true, 'takes less than 50ms to reject query');
        t.equal(res.features.length, 0, 'finds no features');
        t.end();
    });
});

tape('teardown', function(t) {
    context.getTile.cache.reset();
    t.end();
});

