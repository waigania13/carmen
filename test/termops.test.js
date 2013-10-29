var assert = require('assert'),
    termops = require('../lib/util/termops');

describe('termops', function() {
    describe('tokenize', function() {
        describe('examples', function() {
            it('tokenizes basic strings', function() {
                assert.deepEqual(termops.tokenize('foo'), ['foo']);
                assert.deepEqual(termops.tokenize('foo bar'), ['foo', 'bar']);
                assert.deepEqual(termops.tokenize('foo-bar'), ['foo', 'bar']);
            });
        });
        describe('edge cases', function() {
            it('empty string', function() {
                assert.deepEqual(termops.tokenize(''), []);
            });
        });
    });
    describe('terms', function() {
        it('tokenizes and hashes values', function() {
            assert.deepEqual(termops.terms('foo bar'), [703823573,917994779]);
        });
    });
    describe('termsMap', function() {
        it('tokenizes and hashes values', function() {
            assert.deepEqual(termops.termsMap('foo bar'), {
                703823573: 'foo',
                917994779: 'bar'
            });
        });
    });
    describe('degens', function() {
        it('generates degenerates', function() {
            assert.deepEqual(termops.degens('foo'), {703823573:2815294292});
        });
    });
    describe('phrase', function() {
        it('generates a name id', function() {
            assert.deepEqual(termops.phrase('foo'), 927239893);
        });
    });
});
