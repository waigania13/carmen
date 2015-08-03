var termops = require('../lib/util/termops');
var test = require('tape');

test('numTokenV2', function(assert) {
    assert.deepEqual(termops.numTokenV2(''), '', 'no digits');
    assert.deepEqual(termops.numTokenV2('1'), '#', '1 digit');
    assert.deepEqual(termops.numTokenV2('12'), '##', '2 digit');
    assert.deepEqual(termops.numTokenV2('123'), '###', '3 digit');
    assert.deepEqual(termops.numTokenV2('1234'), '####', '4 digit');
    assert.deepEqual(termops.numTokenV2('12345'), '#####', '5 digit');
    assert.end();
});

