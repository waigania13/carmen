'use strict';
const roundTo = require('../../../lib/util/round-to.js');
const test = require('tape');

test('roundTo', (t) => {
    t.equals(roundTo(1.1234, 0), 1);
    t.equals(roundTo(1.1234, 1), 1.1);
    t.equals(roundTo(1.1234, 2), 1.12);
    t.equals(roundTo(1.1234, 3), 1.123);
    t.equals(roundTo(1.1234, 4), 1.1234);
    t.equals(roundTo(1.1234, 5), 1.1234);

    t.end();
});
