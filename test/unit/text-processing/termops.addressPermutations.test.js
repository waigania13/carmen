/* eslint-disable require-jsdoc */
'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('termops.addressPermutations', (t) => {
    let a = termops.permutations(['a','b','c'], [0.2, 0.2, 0.6]);
    const b = termops.permutations(['a','b','c'], [0.2, 0.1, 0.7]);

    function debug(v) {
        return v.join(' ') + (v.relev ? ' - ' + v.relev : '');
    }
    function withAddress(array, address) {
        array.address = address;
        return array;
    }
    t.deepEqual(termops.addressPermutations(a).length, 6, 'a: 6 uniq permutations');
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        'a b c - 1',
        'a b - 0.4',
        'b c - 0.8',
        'a - 0.2',
        'b - 0.2',
        'c - 0.6'
    ]);

    t.deepEqual(termops.addressPermutations(a.concat(b)).length, 7, 'ab: 7 uniq permutations');
    t.deepEqual(termops.addressPermutations(a.concat(b)).map(debug), [
        'a b c - 1',
        'a b - 0.4',
        'b c - 0.8',
        'a - 0.2',
        'b - 0.2',
        'c - 0.6',
        'c - 0.8'
    ]);

    a = termops.permutations(withAddress(['##','b','c'], { number: 12, position: 0 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '## b c',
        '## b',
        'b c',
        '##',
        'b',
        'c'
    ], '## leading housenum');

    a = termops.permutations(withAddress(['2##','b','c'], { number: 200, position: 0 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '2## b c',
        '2## b',
        'b c',
        '2##',
        'b',
        'c'
    ], '2## leading housenum');

    a = termops.permutations(withAddress(['a','b','##'], { number: 12, position: 2 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '## a b',
        'a b',
        '## b',
        'a',
        'b',
        '##'
    ], 'trailing housenum ##');

    a = termops.permutations(withAddress(['a','b','2##'], { number: 200, position: 2 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '2## a b',
        'a b',
        '2## b',
        'a',
        'b',
        '2##'
    ], 'trailing housenum 2##');

    a = termops.permutations(withAddress(['a','##','c'], { number: 12, position: 1 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '## a',
        '## c',
        'a',
        '##',
        'c'
    ], 'landlocked housenum ##');

    a = termops.permutations(withAddress(['a','2##','c'], { number: 200, position: 1 }));
    t.deepEqual(termops.addressPermutations(a).map(debug), [
        '2## a',
        '2## c',
        'a',
        '2##',
        'c'
    ], 'landlocked housenum 2##');

    t.end();
});

