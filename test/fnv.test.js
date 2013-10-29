var assert = require('assert'),
    fnv = require('../lib/util/fnv');

describe('fnv', function() {
    describe('.fnv1a', function() {
        it('strings', function() {
            assert.deepEqual(fnv.fnv1a('foo'), 2851307223);
            assert.deepEqual(fnv.fnv1a('foo bar'), 1170285226);
            assert.deepEqual(fnv.fnv1a(''), 2166136261);
        });
    });
    describe('.fnvfold', function() {
        it('strings', function() {
            assert.deepEqual(fnv.fnvfold('foo', 8), 11137961);
        });
    });
});
