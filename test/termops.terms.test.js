var termops = require('../lib/util/termops');
var test = require('tape');

test('terms - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.terms(['foo','bar']), [ 1576618561102267, 1584039266808027 ]);
    assert.end();
});

