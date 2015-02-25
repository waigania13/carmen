var ops = require('../lib/util/ops');
var test = require('tape');

test('ops', function(t) {
    t.test('sortDegens', function(q) {
        q.deepEqual([0, 4, 5].sort(ops.sortDegens), [0, 4, 5]);
        q.deepEqual([5, 6, 4].sort(ops.sortDegens), [4, 5, 6]);
        q.end();
    });
    t.test('zxy', function(q) {
        q.deepEqual(ops.zxy(0, '4/0/0'), 0);
        q.deepEqual(ops.zxy(20, '4/3/3'), 1649368104980);
        q.end();
    });

    t.test('grid', function(q) {
        q.deepEqual(ops.grid(0), {id: 0, x: 0, y: 0});
        q.deepEqual(ops.grid(1649368104980), {id: 20, x: 3, y:3});
        q.end();
    });
    t.end();
});
