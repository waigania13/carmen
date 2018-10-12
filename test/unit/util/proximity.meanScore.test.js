'use strict';

const meanScore = require('../../../lib/util/proximity').meanScore;
const test = require('tape');

test('find the geometric mean of 2 and 8', (t) => {
    const input = [
        { properties: { 'carmen:score': 2 } },
        { properties: { 'carmen:score': 8 } }
    ];

    t.equal(meanScore(input), 4, 'geometric mean of 2 and 8 is 4');
    t.end();
});

test('find the geometric mean of 2 and 8', (t) => {
    const input = [
        { properties: { 'carmen:score': 0 } },
        { properties: { 'carmen:score': 4 } }
    ];

    t.equal(meanScore(input), 2, 'geometric mean of 0 and 4 is 2');
    t.end();
});

test('throw an error if carmen:score is not a number', (t) => {
    const input = [
        { properties: { 'carmen:score': undefined } },
        { properties: { 'carmen:score': 4 } }
    ];

    t.throws(() => {
        meanScore(input);
    }, /carmen:score is not a number/);
    t.end();
});
