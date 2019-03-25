'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

const withAddress = (array, address) => {
    array.address = address;
    return array;
};

test('numTokenize', (t) => {
    t.deepEqual(termops.numTokenize(['foo-bar'],3), [], 'no numbers');
    t.deepEqual(termops.numTokenize(['69-150'],3), [withAddress(['69###'], { number: '69-150', position: 0 })], 'numbers with dash');
    t.deepEqual(termops.numTokenize(['69-150a'],3), [withAddress(['69###'], { number: '69-150a', position: 0 })], 'number with dash and suffix');
    t.deepEqual(termops.numTokenize(['69/150'],3), [], 'strips numbers with slash');
    t.deepEqual(termops.numTokenize(['69/150a'],3), [], 'strips numbers with slash and suffix');
    t.deepEqual(termops.numTokenize(['500', 'main', 'street', '20009'],3), [
        withAddress(['5##', 'main', 'street', '20009'], { number: '500', position: 0 }),
        withAddress(['500', 'main', 'street', '20###'], { number: '20009', position: 3 }),
    ], 'two numbers');
    t.deepEqual(termops.numTokenize(['500', 'main', 'street', 'apt', '205', '20009'],3), [
        withAddress(['5##', 'main', 'street', 'apt', '205', '20009'], { number: '500', position: 0 }),
        withAddress(['500', 'main', 'street', 'apt', '2##', '20009'], { number: '205', position: 4 }),
        withAddress(['500', 'main', 'street', 'apt', '205', '20###'], { number: '20009', position: 5 }),
    ], 'three numbers');
    t.deepEqual(termops.numTokenize(['697к4'],3), [withAddress(['6##'], { number: '697к4', position: 0 })], 'russian-style address numbers with korpus');
    t.deepEqual(termops.numTokenize(['697с20'],3), [withAddress(['6##'], { number: '697с20', position: 0 })], 'russian-style address numbers with stroenie');
    t.deepEqual(termops.numTokenize(['697к4с20'],3), [withAddress(['6##'], { number: '697к4с20', position: 0 })], 'russian-style address numbers with korpus and stroenie');
    t.end();
});

