/* eslint-disable require-jsdoc */
'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

function bearablePermutations(permutations) {
    return permutations.map((v) => {
        return {
            phrase: Array.from(v),
            mask: v.mask,
            ender: v.ender,
            relev: v.relev
        };
    });
}

test('termops.intersectionPermutations', (t) => {
    let results;
    const intersectionArray = ['main', 'street', 'and', 'first', 'street', 'springfield', 'IL', '62700'];
    results = termops.intersectionPermutations(intersectionArray, 'intersection');
    t.equal(results.length, 0);
    results = termops.intersectionPermutations(intersectionArray, 'and');
    const expected = [
        { phrase: ['+intersection', 'main', 'street', ',', 'first'], mask: 15, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street'], mask: 31, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield'], mask: 63, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield', 'IL'], mask: 127, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield', 'IL', '62700'], mask: 255, ender: true, relev: 0 },
    ];
    t.deepEqual(bearablePermutations(results), expected);
    t.end();
});
