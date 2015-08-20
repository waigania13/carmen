var termops = require('../lib/util/termops');
var test = require('tape');

test('terms - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.terms(['foo','bar']), [ 2952770666596324, 3473082963449669 ]);
    assert.end();
});

