var termops = require('../lib/util/termops');
var test = require('tape');

test('terms - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.terms(['foo','bar']), [2851307223, 1991736602]);
    assert.end();
});

