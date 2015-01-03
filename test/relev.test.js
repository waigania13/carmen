var Relev = require('../lib/util/relev');
var test = require('tape');

test('relev', function(t) {
    var r = new Relev(8796118859120642);
    t.equal(r.id, 2);
    t.equal(r.relev, 1);
    t.equal(r.reason, 3);
    t.equal(r.count, 2);
    t.equal(r.idx, 2);
    t.equal(r.tmpid, 200000002);
    t.end();
});
