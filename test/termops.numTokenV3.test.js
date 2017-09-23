const termops = require('../lib/util/termops');
const test = require('tape');

test('numTokenV3', (t) => {
    t.deepEqual(termops.numTokenV3(''), '', 'no digits');
    t.deepEqual(termops.numTokenV3('1'), '#', '1 digit');
    t.deepEqual(termops.numTokenV3('12'), '##', '2 digit');
    t.deepEqual(termops.numTokenV3('123'), '1##', '3 digit');
    t.deepEqual(termops.numTokenV3('1234'), '1###', '4 digit');
    t.deepEqual(termops.numTokenV3('12345'), '1####', '5 digit');
    t.deepEqual(termops.numTokenV3('123456'), '1#####', '6 digit');
    t.deepEqual(termops.numTokenV3('1234567'), '1######', '7 digit');
    t.deepEqual(termops.numTokenV3('12345678'), '1#######', '8 digit');
    t.end();
});

