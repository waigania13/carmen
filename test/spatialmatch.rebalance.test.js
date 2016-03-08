var rebalance = require('../lib/spatialmatch.js').rebalance;
var test = require('tape');

test('rebalance, no garbage', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];
    var stack = [
        { mask: 7, text: '1## main st', weight: 0.5 },
        { mask: 8, text: '12345', weight: 0.16666666666666666 },
        { mask: 16, text: 'seattle', weight: 0.16666666666666666 },
        { mask: 32, text: 'washington', weight: 0.16666666666666666 },
    ];
    stack.relev = 1;

    var rebalanced = rebalance(query, stack);
    assert.equal(rebalanced.relev, 1, 'relev = 1');
    assert.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[3].weight, 0.25, 'weight = 0.25');
    assert.end();
});

test('rebalance, with garbage', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];
    var stack = [
        { mask: 7, text: '1## main st', weight: 0.5 },
        { mask: 8, text: '12345', weight: 0.16666666666666666 },
        { mask: 32, text: 'washington', weight: 0.16666666666666666 },
    ];
    stack.relev = 0.8333333333333333;

    var rebalanced = rebalance(query, stack);
    assert.equal(rebalanced.relev, 0.75, 'relev = 0.75');
    assert.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    assert.end();
});

