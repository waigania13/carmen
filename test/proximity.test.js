var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy(0,0,5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy(-90,45,5), [5,8,11]);
    assert.end();
});

test('proximity.pxy2zxy', function(assert) {
    assert.deepEqual(proximity.pxy2zxy([0,0,0], 5), [5,16,16]);
    assert.deepEqual(proximity.pxy2zxy([1,0,0], 2), [2,1,1]);
    assert.deepEqual(proximity.pxy2zxy([1,0,0], 3), [3,2,2]);
    assert.deepEqual(proximity.pxy2zxy([1,0,0], 5), [5,8,8]);
    assert.end();
});

