var Relev = require('../lib/util/relev');
var test = require('tape');

test('relev', function(t) {
    var r = new Relev(0, 1, 2, 1, 3, 'place', 'place', 5);
    t.equal(r.id, 0);
    t.equal(r.relev, 1);
    t.equal(r.reason, 2);
    t.equal(r.count, 1);
    t.equal(r.idx, 3);
    t.equal(r.dbid, 'place');
    t.equal(r.dbname, 'place');
    t.equal(r.tmpid, 5);
    t.end();
});
