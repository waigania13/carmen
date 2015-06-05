var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.termsWeighted', function(assert) {
    var res;

    res = termops.termsWeighted([
        'a',
        'b',
        'c'
    ], {
        0:[10003],
        3826002208:[10000],
        3876335072:[1],
        3859557456:[1]
    });
    assert.deepEqual(res, [
        3826002208 + 1,
        3876335072 + 15,
        3859557456 + 15
    ], 'weights terms');

    res = termops.termsWeighted([
        'a',
        'b',
        'c'
    ], {
        0:[1000],
        3826002208:[10000],
        3876335072:[1],
        3859557456:[1]
    });
    assert.deepEqual(res, [
        3826002208 + 1,
        3876335072 + 15,
        3859557456 + 15
    ], 'weights > 0 even if freq drops below total');

    res = termops.termsWeighted([
        'a'
    ], {
        0:[0]
    });
    assert.deepEqual(res, [
        3826002208 + 15
    ], 'weights > 0 even if freq == 0');

    assert.end();
});

