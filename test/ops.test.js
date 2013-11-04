var assert = require('assert'),
    ops = require('../lib/util/ops');

describe('ops', function() {
    describe('resolveCode', function() {
        it('resolves basic codes', function() {
            assert.equal(ops.resolveCode(80), 47);
            assert.equal(ops.resolveCode(100), 66);
        });
    });
    describe('sortDegens', function() {
        it('sorts degens', function() {
            assert.deepEqual([0, 4, 5].sort(ops.sortDegens), [0, 4, 5]);
            assert.deepEqual([5, 6, 4].sort(ops.sortDegens), [4, 5, 6]);
        });
    });
    describe('zxy', function() {
        it('encodes zxy values', function() {
            assert.deepEqual(ops.zxy(0, '4/0/0'), 0);
            assert.deepEqual(ops.zxy(20, '4/3/3'), 1649368104980);
        });
    });
});
