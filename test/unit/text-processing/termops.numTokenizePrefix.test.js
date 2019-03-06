'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('numTokenizePrefix', (t) => {
    t.deepEqual(termops.numTokenizePrefix('foo',3), [], 'no numbers');
    t.deepEqual(termops.numTokenizePrefix('69-150',3), [['69###']], 'only numbers');
    t.deepEqual(termops.numTokenizePrefix('500 main street 20009',3), [], '>1 tokens');

    t.deepEqual(termops.numTokenizePrefix('5', 3), [['#']], '1 1-digit numeric token (omits original)');
    t.deepEqual(termops.numTokenizePrefix('50', 3), [['##'], ['5#']], '1 2-digit numeric token (omits original)');
    t.deepEqual(termops.numTokenizePrefix('500', 3), [['5##'], ['50#']], '3 1-digit numeric token (omits original)');
    t.deepEqual(termops.numTokenizePrefix('5000', 3), [['50##']], '1 4-digit numeric token (omits original)');

    t.end();
});

