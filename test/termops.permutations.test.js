var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.permutations', function(assert) {
    assert.deepEqual(termops.permutations(['a','b','c','d']), [
        ['a','b','c','d'],
        ['a','b','c'],
        ['b','c','d'],
        ['a','b'],
        ['b','c'],
        ['c','d'],
        ['a'],
        ['b'],
        ['c'],
        ['d'],
    ]);
    assert.deepEqual(termops.permutations(['a','b','c']), [
        ['a','b','c'],
        ['a','b'],
        ['b','c'],
        ['a'],
        ['b'],
        ['c'],
    ]);
    assert.deepEqual(termops.permutations(['a','b']), [
        ['a','b'],
        ['a'],
        ['b'],
    ]);
    assert.deepEqual(termops.permutations(['a']), [
        ['a'],
    ]);
    assert.end();
});

test('termops.permutations (relev)', function(assert) {
    var permutations = termops.permutations(['a','b','c','d'], [0.1, 0.1, 0.2, 0.6]);
    permutations.length = 10;

    assert.deepEqual(permutations[0].relev, 1);
    assert.deepEqual(permutations[0].join(','), ['a','b','c','d'].join(','));

    assert.deepEqual(permutations[1].relev, 0.4);
    assert.deepEqual(permutations[1].join(','), ['a','b','c'].join(','));

    assert.deepEqual(permutations[2].relev, 1.0);
    assert.deepEqual(permutations[2].join(','), ['b','c','d'].join(','));

    assert.end();
});

