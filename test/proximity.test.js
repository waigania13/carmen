var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity.center2zxy', function(assert) {
    assert.deepEqual(proximity.center2zxy(0,0,5), [5,16,16]);
    assert.deepEqual(proximity.center2zxy(-90,45,5), [5,8,11]);
    assert.end();
});

test('proximity._scoredist', function(assert) {
    assert.equal(proximity._scoredist(1, 80.0), 1, '80.0 miles => 1');
    assert.equal(proximity._scoredist(1, 40.0), 2, '40.0 miles => 2');
    assert.equal(proximity._scoredist(1, 20.0), 4, '20.0 miles => 4');
    assert.equal(proximity._scoredist(1, 8.0),  10,   '8.0 miles => 10');
    assert.equal(proximity._scoredist(1, 4.0),  20,   '4.0 miles => 20');
    assert.equal(proximity._scoredist(1, 2.0),  40,   '2.0 miles => 40');
    assert.equal(proximity._scoredist(1, 1.0),  80,   '1.0 miles => 80');
    assert.equal(proximity._scoredist(1, 0.2),  400,  '0.2 miles => 400');
    assert.equal(proximity._scoredist(1, 0.1),  800,  '0.1 miles => 800');
    assert.equal(proximity._scoredist(1, 0.0),  800000, '0.0 miles => 800000');
    assert.end();
});

test('proximity.scoredist', function(assert) {
    // lon/lat center
    assert.equal(proximity.scoredist([0,0], [0,0], 1000), 8e8, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [0.05,0], 1000), 23149.8099, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [2.00,0], 1000), 578.7452, 'll scoredist');
    assert.equal(proximity.scoredist([0,0], [10.00,0], 1000), 115.749, 'll scoredist');

    // zxy center
    assert.equal(proximity.scoredist([0,0], [0,0,0], 1000), 8e8, 'zxy scoredist');
    assert.equal(proximity.scoredist([0,0], [1,0,0], 1000), 12.861, 'zxy scoredist');
    assert.equal(proximity.scoredist([0,0], [1,0,0], 1000), proximity.scoredist([0,0], [-90,45], 1000), 'zxy scoredist ~= ll scoredist');

    assert.end();
});

