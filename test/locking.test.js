var assert = require('assert'),
    Locking = require('../lib/locking');

describe('Locking', function() {
    describe('#loader', function() {
        it('locking-ness', function(done) {
            var l = new Locking();
            l.loader(function(err, data) {
                assert.equal(err, null);
                assert.equal(data, 'foo');
                done();
            })(null, 'foo');
        });

        it('emits open', function(done) {
            var l = new Locking();
            l.on('open', function(err, data) {
                assert.equal(err, null);
                assert.equal(data, 'foo');
                done();
            });
            l.loader(function(err, data) {})(null, 'foo');
        });
    });
});
