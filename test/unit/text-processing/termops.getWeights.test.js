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

    t.end();
});

test('termops.getWeights - sparse set', (t) => {
    const tokens = ['the', 'ups', 'store'];
    const freq = {
        __COUNT__: [100000],
        the: [1000],
        ups: [10],
        store: [50]
    };

    t.deepEqual(termops.getWeights(tokens, freq, 0), [
        0.21538845564815207,
        0.4298528108297949,
        0.354758733522053
    ], 'weights terms');

    t.deepEqual(termops.getWeights(tokens, freq, 3), [
        0.026535360831143863,
        0.6675993732215327,
        0.3058652659473235
    ], 'weights terms');

    t.end();
});

function sum(memo, val) { return memo + val; }
