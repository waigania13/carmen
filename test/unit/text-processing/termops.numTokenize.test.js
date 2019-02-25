'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('numTokenize', (t) => {
    t.deepEqual(termops.numTokenize(['foo-bar'],3), [], 'no numbers');
    t.deepEqual(termops.numTokenize(['69-150'],3), [['69###']], 'numbers with dash');
    t.deepEqual(termops.numTokenize(['69-150a'],3), [['69###']], 'number with dash and suffix');
    t.deepEqual(termops.numTokenize(['69/150'],3), [], 'strips numbers with slash');
    t.deepEqual(termops.numTokenize(['69/150a'],3), [], 'strips numbers with slash and suffix');
    t.deepEqual(termops.numTokenize(['500', 'main', 'street', '20009'],3), [
        ['5##', 'main', 'street', '20009'],
        ['500', 'main', 'street', '20###'],
    ], 'two numbers');
    t.deepEqual(termops.numTokenize(['500', 'main', 'street', 'apt', '205', '20009'],3), [
        ['5##', 'main', 'street', 'apt', '205', '20009'],
        ['500', 'main', 'street', 'apt', '2##', '20009'],
        ['500', 'main', 'street', 'apt', '205', '20###'],
    ], 'three numbers');
    t.end();
});

