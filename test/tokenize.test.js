var assert = require('assert'),
    tokenize = require('../lib/tokenize');

describe('tokenize', function() {
    describe('examples', function() {
        it('tokenizes basic strings', function() {
            assert.deepEqual(tokenize('foo'), ['foo']);
            assert.deepEqual(tokenize('foo bar'), ['foo', 'bar']);
            assert.deepEqual(tokenize('foo-bar'), ['foo', 'bar']);
        });
    });
    describe('edge cases', function() {
        it('empty string', function() {
            assert.deepEqual(tokenize(''), []);
        });
    });
});
