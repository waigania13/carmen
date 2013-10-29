var assert = require('assert'),
    ops = require('../lib/util/ops');

describe('ops', function() {
    describe('resolveCode', function() {
        it('resolves basic codes', function() {
            assert.equal(ops.resolveCode(80), 47);
            assert.equal(ops.resolveCode(100), 66);
        });
    });
    describe('sortMod4', function() {
        it('sorts terms', function() {
            assert.deepEqual([0, 4, 5].sort(ops.sortMod4), [0, 4, 5]);
            assert.deepEqual([0, -14, 5].sort(ops.sortMod4), [-14, 0, 5]);
        });
    });
    describe('zxy', function() {
        it('encodes zxy values', function() {
            assert.deepEqual(ops.zxy(0, '4/0/0'), 0);
            assert.deepEqual(ops.zxy(20, '4/3/3'), 1649368104980);
        });
    });
});
