var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.getHousenumRange', function(assert) {
    assert.deepEqual(termops.getHousenumRange({}), false, 'non-address doc => false');
    assert.deepEqual(termops.getHousenumRange({_cluster:{}}), false, 'empty _cluster => false');

    assert.deepEqual(termops.getHousenumRange({
        _cluster: JSON.stringify({0:{},10:{}})
    }), ['#','##'], 'parses JSON _cluster');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ 0: {}, 10: {} }
    }), ['#','##'], '_cluster => 0,10');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ 0: {}, 10000000000: {} }
    }), ['#','###########'], 'limits range to 0-1048575');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ 5: {}, 10: {}, 1: {}, 13: {} }
    }), ['#','##'], '_cluster => [1,13]');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ '5a': {}, '10b': {}, '1c': {}, '13d': {} }
    }), ['#','##'], '_cluster => [1,13]');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ 'lot 1': {}, 'lot 10': {} }
    }), ['#','##'], '_cluster => [1,10]');

    assert.deepEqual(termops.getHousenumRange({
        _cluster:{ 'apt a': {}, 'apt b': {} }
    }), false, '_cluster (non-numeric) => false');

    assert.deepEqual(termops.getHousenumRange({
        _rangetype:'tiger',
        _lfromhn:['5','11','0','100']
    }), ['#','##','###'], '_rangetype + _lfromhn => [0,100]');

    assert.deepEqual(termops.getHousenumRange({
        _rangetype:'tiger',
        _lfromhn:['100'],
        _ltohn:['10']
    }), ['##','###'], '_rangetype + _lfromhn,_ltohn => [10,100]');

    assert.deepEqual(termops.getHousenumRange({
        _rangetype:'tiger',
        _rfromhn:['5','11','0','100']
    }), ['#','##','###'], '_rangetype + _rfromhn => [0,100]');

    assert.deepEqual(termops.getHousenumRange({
        _rangetype:'tiger',
        _rfromhn:['100'],
        _rtohn:['10']
    }), ['##','###'], '_rangetype + _rfromhn,_rtohn => [10,100]');

    assert.end();
});
