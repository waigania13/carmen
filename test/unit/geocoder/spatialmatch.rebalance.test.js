'use strict';
const rebalance = require('../../../lib/geocoder/spatialmatch').rebalance;
const Phrasematch = require('../../../lib/geocoder/phrasematch').Phrasematch;
const test = require('tape');

test('rebalance, no garbage', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];
    const stack = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stack.relev = 1;

    const rebalanced = rebalance(query, stack);
    t.equal(rebalanced.relev, 1, 'relev = 1');
    t.equal(rebalanced[0].weight, 0.26, 'weight = 0.25');
    t.equal(rebalanced[1].weight, 0.24666667, 'weight = 0.25');
    t.equal(rebalanced[2].weight, 0.24666667, 'weight = 0.25');
    t.equal(rebalanced[3].weight, 0.24666667, 'weight = 0.25');
    t.end();
});

test('rebalance, with garbage', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];

    const stack = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stack.relev = 0.8333333333333333;

    const rebalanced = rebalance(query, stack);
    t.equal(rebalanced.relev, 0.75333334, 'relev = 0.75');
    t.equal(rebalanced[0].weight, 0.26, 'weight = 0.25');
    t.equal(rebalanced[1].weight, 0.24666667, 'weight = 0.25');
    t.equal(rebalanced[2].weight, 0.24666667, 'weight = 0.25');
    t.end();
});

test('rebalance copies', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];

    const stackA = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stackA.relev = 1;

    const stackB = [];
    stackB[0] = stackA[0];

    const rebalancedA = rebalance(query, stackA);
    const rebalancedB = rebalance(query, stackB);

    // Assert that the subqueries in rebalancedA are not affected by
    // the rebalance done to rebalancedB.
    t.equal(rebalancedA.relev, 1, 'relev = 1');
    t.equal(rebalancedA[0].weight, 0.26, 'weight = 0.25');
    t.equal(rebalancedA[1].weight, 0.24666667, 'weight = 0.25');
    t.equal(rebalancedA[2].weight, 0.24666667, 'weight = 0.25');
    t.equal(rebalancedA[3].weight, 0.24666667, 'weight = 0.25');

    // Vice versa.
    t.equal(rebalancedB.relev, 0.50, 'relev = 0.50');
    t.equal(rebalancedB[0].weight, 0.50, 'weight = 0.50');

    t.end();
});

