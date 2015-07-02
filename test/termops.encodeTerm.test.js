var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodeTerm', function(assert) {
    assert.deepEqual(termops.encodeTerm('main'), 3935363592, 'encodes term');
    assert.deepEqual(termops.encodeTerm('1234'), 4257489661, 'encodes numeric term');
    assert.deepEqual(termops.encodeTerm('2345b'), 784195493, 'encodes seminumeric term');
    assert.deepEqual(termops.encodeTerm('LS24'), 651597038, 'encodes non-address numeric term with fnv1a');
    assert.end();
});

