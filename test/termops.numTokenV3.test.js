var termops = require('../lib/util/termops');
var test = require('tape');

test('numTokenV3', function(assert) {
    assert.deepEqual(termops.numTokenV3(''), '', 'no digits');
    assert.deepEqual(termops.numTokenV3('1'), '#', '1 digit');
    assert.deepEqual(termops.numTokenV3('12'), '##', '2 digit');
    assert.deepEqual(termops.numTokenV3('123'), '1##', '3 digit');
    assert.deepEqual(termops.numTokenV3('1234'), '12##', '4 digit');
    assert.deepEqual(termops.numTokenV3('12345'), '12###', '5 digit');
    assert.deepEqual(termops.numTokenV3('123456'), '12####', '6 digit');
    assert.deepEqual(termops.numTokenV3('1234567'), '12#####', '7 digit');
    assert.deepEqual(termops.numTokenV3('12345678'), '12######', '8 digit');
    assert.end();
});

