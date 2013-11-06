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
            assert.deepEqual(termops.terms('foo bar'), [2851307220,1991736600]);
        });
    });
    describe('termsMap', function() {
        it('tokenizes and hashes values', function() {
            assert.deepEqual(termops.termsMap('foo bar'), {
                2851307220: 'foo',
                1991736600: 'bar'
            });
        });
    });
    describe('degens', function() {
        it('generates degenerates', function() {
            var degens = termops.degens('foobarbaz');
            assert.deepEqual(degens, {
                967483784: 1617781335,
                1062237932: 1617781335,
                1617781332: 1617781332,
                2851307220: 1617781335,
                2921073340: 1617781334,
                3214735720: 1617781335,
                4112850188: 1617781333
            });
            for (var k in degens) {
                // Encodes ID for 'foobarbaz'.
                assert.equal(degens[k] >>> 2 << 2 >>> 0, termops.terms('foobarbaz')[0]);
                // Encodes degen distance (max: 3) from foobarbaz.
                assert.ok(degens[k] % 4 <= 3);
            }
        });
    });
    describe('phrase', function() {
        it('generates a name id', function() {
            assert.deepEqual(termops.phrase('foo'), 2851307223);
            assert.deepEqual(termops.phrase('foo street'), 1742112471);
            assert.deepEqual(termops.phrase('foo lane'), 3289807063);
            // Clusters phrase IDs based on initial term.
            assert.deepEqual(termops.phrase('foo') % 256, 215);
            assert.deepEqual(termops.phrase('foo street') % 256, 215);
            assert.deepEqual(termops.phrase('foo lane') % 256, 215);
        });
    });
});
