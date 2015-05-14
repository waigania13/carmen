var termops = require('../lib/util/termops');
var test = require('tape');

test('terms - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.terms(['foo','bar']), [2851307216,1991736592]);
    assert.end();
});

