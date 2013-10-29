var assert = require('assert'),
    Relev = require('../lib/util/relev');

describe('relev', function() {
    describe('construction', function() {
        it('is constructed', function() {
            var r = new Relev(0, 1, 2, 3, 'place', 5);
            assert.equal(r.id, 0);
            assert.equal(r.relev, 1);
            assert.equal(r.reason, 2);
            assert.equal(r.idx, 3);
            assert.equal(r.db, 'place');
            assert.equal(r.tmpid, 5);
        });
    });
});
