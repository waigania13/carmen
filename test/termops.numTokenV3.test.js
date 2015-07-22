var termops = require('../lib/util/termops');
var test = require('tape');

test('numTokenV3', function(assert) {
    assert.deepEqual(termops.numTokenV3(''), '', 'no digits');
    assert.deepEqual(termops.numTokenV3('1'), '#', '1 digit');
    assert.deepEqual(termops.numTokenV3('12'), '##', '2 digit');
    assert.deepEqual(termops.numTokenV3('123'), '1##', '3 digit');
    assert.deepEqual(termops.numTokenV3('1234'), '1###', '4 digit');
    assert.deepEqual(termops.numTokenV3('12345'), '1####', '5 digit');
    assert.deepEqual(termops.numTokenV3('123456'), '1#####', '6 digit');
    assert.deepEqual(termops.numTokenV3('1234567'), '1######', '7 digit');
    assert.deepEqual(termops.numTokenV3('12345678'), '1#######', '8 digit');
    assert.end();
});

