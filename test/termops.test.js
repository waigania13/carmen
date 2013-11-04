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
            var degens = termops.degens('foobarbaz');
            assert.deepEqual(degens, {
                '544039508': 2176158032,
                '703823573': 2176158035,
                '773589692': 2176158034,
                '891624718': 2176158033,
                '967483786': 2176158035,
                '1062237935': 2176158035,
                '1067252074': 2176158035
            });
            for (var k in degens) {
                // Encodes ID for 'foobarbaz'.
                assert.equal(Math.floor(degens[k]/4), termops.terms('foobarbaz')[0]);
                // Encodes degen distance (max: 3) from foobarbaz.
                assert.ok(degens[k] % 4 <= 3);
            }
        });
    });
    describe('phrase', function() {
        it('generates a name id', function() {
            assert.deepEqual(termops.phrase('foo'), 927239893);
            assert.deepEqual(termops.phrase('foo street'), 1745043157);
            assert.deepEqual(termops.phrase('foo lane'), 1732767445);
            // Clusters phrase IDs based on initial term.
            assert.deepEqual(termops.phrase('foo') % 4096, 3797);
            assert.deepEqual(termops.phrase('foo street') % 4096, 3797);
            assert.deepEqual(termops.phrase('foo lane') % 4096, 3797);
        });
    });
});
