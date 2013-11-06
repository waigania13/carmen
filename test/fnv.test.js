var assert = require('assert'),
    fnv1a = require('../lib/util/fnv');

describe('fnv1a', function() {
    it('strings', function() {
        assert.deepEqual(fnv1a('foo'), 2851307223);
        assert.deepEqual(fnv1a('foo bar'), 1170285226);
        assert.deepEqual(fnv1a('foo').toString(2), '10101001111100110111111011010111');
        assert.deepEqual(fnv1a(''), 2166136261);
        assert.deepEqual(fnv1a('foo', 24), 2851307008);
        assert.deepEqual(fnv1a('foo', 24).toString(2),'10101001111100110111111000000000');
    });
});
