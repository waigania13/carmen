'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('termops.getWeights', (t) => {
    let res;
    let tokens;

    tokens = ['a','b','c'];
    const freq = {};
    freq['__COUNT__'] = [1002];
    freq[tokens[0]] = [1000];
    freq[tokens[1]] = [1];
    freq[tokens[2]] = [1];

    res = termops.getWeights(tokens, freq);
    t.deepEqual(res, [
        0.047820577394264194,
        0.47608971130286787,
        0.47608971130286787
    ], 'weights terms');
    t.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    tokens = ['###', 'a','b','c'];
    res = termops.getWeights(tokens, freq);
    t.deepEqual(res, [
        0.2,
        0.038256461915411356,
        0.3808717690422943,
        0.3808717690422943
    ], 'weights numTokens @ 0.2 and adjusts others');
    t.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    tokens = ['a','b','c','###'];
    res = termops.getWeights(tokens, freq);
    t.deepEqual(res, [
        0.038256461915411356,
        0.3808717690422943,
        0.3808717690422943,
        0.2
    ], 'weights numTokens @ 0.2 and adjusts others');
    t.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    tokens = ['+intersection','a','b'];
    res = termops.getWeights(tokens, freq);
    t.deepEqual(res, [
        0.4,
        0.05476576248943511,
        0.5452342375105649
    ], 'weights intersections @ 0.4 and adjusts others');
    t.equal(res.reduce(sum,0), 1, 'weights sum to 1');
    t.end();
});

function sum(memo, val) { return memo + val; }
