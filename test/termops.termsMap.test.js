var termops = require('../lib/util/termops');
var test = require('tape');

test('termsMap - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.termsMap(['foo','bar']), {
        2851307216: 'foo',
        1991736592: 'bar'
    });
    assert.end();
});

