var assert = require('assert'),
    Relev = require('../lib/util/relev');

describe('relev', function() {
    describe('construction', function() {
        it('is constructed', function() {
            var r = new Relev(0, 1, 2, 1, 3, 'place', 'place', 5);
            assert.equal(r.id, 0);
            assert.equal(r.relev, 1);
            assert.equal(r.reason, 2);
            assert.equal(r.count, 1);
            assert.equal(r.idx, 3);
            assert.equal(r.dbid, 'place');
            assert.equal(r.dbname, 'place');
            assert.equal(r.tmpid, 5);
        });
    });
});
