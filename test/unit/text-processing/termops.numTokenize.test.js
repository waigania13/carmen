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

    // intersection
    t.deepEqual(termops.numTokenize('9th street northwest and f street northwest'), [
        [ '+intersection', '9th', 'street', 'northwest', ',', 'f', 'street', 'northwest' ],
    ], 'tokenize intersections');
    t.end();
});
