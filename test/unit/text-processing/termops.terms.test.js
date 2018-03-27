'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('terms - tokenizes and hashes values', (t) => {
    t.deepEqual(termops.terms(['foo','bar']), ['foo', 'bar']);
    t.end();
});

