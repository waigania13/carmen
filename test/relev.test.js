var Relev = require('../lib/util/relev');
var test = require('tape');

test('relev', function(t) {
    var r = new Relev(8796118859120642);
    t.equal(r.id, 2);
    t.equal(r.relev, 1);
    t.equal(r.reason, 3);
    t.equal(r.count, 2);
    t.equal(r.idx, 2);
    t.equal(r.tmpid, Math.pow(2,25)*2 + 2);
    t.end();
});

test('encode', function(t) {
    t.deepEqual(Relev.encode({
        id: 2,
        relev: 1,
        reason: 3,
        count: 2,
        idx: 2
    }), 8796118859120642);
    t.end();
});
