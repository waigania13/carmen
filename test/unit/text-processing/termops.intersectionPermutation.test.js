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
    let results, expected;
    const query = termops.tokenize('main street and first street springfield IL 62700');
    results = termops.intersectionPermutations(query, 'intersection');
    t.equal(results.length, 0);
    results = termops.intersectionPermutations(query, 'and');
    expected = [
        { phrase: ['+intersection', 'main', 'street', ',', 'first'], mask: 15, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street'], mask: 31, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield'], mask: 63, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield', 'il'], mask: 127, ender: false, relev: 0 },
        { phrase: ['+intersection', 'main', 'street', ',', 'first', 'street', 'springfield', 'il', '62700'], mask: 255, ender: true, relev: 0 },
    ];
    t.deepEqual(bearablePermutations(results), expected);


    // tokens: 'hermannstrasse and allerstrasse berlin'
    results = termops.intersectionPermutations({
        tokens: ['hermann', 'str', 'und', 'aller', 'str', 'berlin'],
        separators: ['', ' ', ' ', ' ', ' ', ''],
        owner: [0, 0, 1, 2, 2, 3]
    }, 'und');
    expected = [
        { phrase: ['+intersection', 'hermann', 'str', ',', 'aller'], mask: 7, ender: false, relev: 0 },
        { phrase: ['+intersection', 'hermann', 'str', ',', 'aller', 'str'], mask: 7, ender: false, relev: 0 },
        { phrase: ['+intersection', 'hermann', 'str', ',', 'aller', 'str', 'berlin'], mask: 15, ender: true, relev: 0 },
    ];
    t.deepEqual(bearablePermutations(results), expected);

    // tokens: 'first & main st'
    results = termops.intersectionPermutations({
        tokens: ['first', 'and', 'main', 'st'],
        separators: ['', ' ', ' '],
        owner: [0, 0, 0, 2]
    }, 'and');
    expected = [
        { phrase: ['+intersection', 'first', ',', 'main'], mask: 1, ender: false, relev: 0 },
        { phrase: ['+intersection', 'first', ',', 'main', 'st'], mask: 7, ender: true, relev: 0 },
    ];
    t.deepEqual(bearablePermutations(results), expected);

    t.end();
});
