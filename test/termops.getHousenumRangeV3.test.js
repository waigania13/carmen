var getHousenumRangeV3 = require('../lib/util/termops').getHousenumRangeV3;
var token = require('../lib/util/token');
var test = require('tape');

test('termops.getHousenumRangeV3', function(assert) {
    assert.deepEqual(getHousenumRangeV3({}), false, 'non-address doc => false');
    assert.deepEqual(getHousenumRangeV3({_cluster:{}}), false, 'empty _cluster => false');

    assert.deepEqual(getHousenumRangeV3({
        _cluster: JSON.stringify({0:{},10:{}})
    }), ['#','##'], 'parses JSON _cluster');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ 0: {}, 10: {} }
    }), ['#','##'], '_cluster => 0,10');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ 0: {}, 10000000000: {} }
    }), ['#','1##########'], '_cluster => [0,10000000000]');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ 5: {}, 10: {}, 1: {}, 13: {}, 3100:{}, 3101:{}, 3503:{} }
    }), ['#','##','3###'], '_cluster => [1,13,3100,3101,3503]');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ '5a': {}, '10b': {}, '1c': {}, '13d': {} }
    }), ['#','##'], '_cluster => [1,13]');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ 'lot 1': {}, 'lot 10': {} }
    }), ['#','##'], '_cluster => [1,10]');

    assert.deepEqual(getHousenumRangeV3({
        _cluster:{ 'apt a': {}, 'apt b': {} }
    }), false, '_cluster (non-numeric) => false');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _lfromhn:['0','11'],
        _ltohn:['5','100']
    }), ['#','##','1##'], '_rangetype + _lfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _lfromhn:['100'],
        _ltohn:['10']
    }), ['##','1##'], '_rangetype + _lfromhn,_ltohn => [10,100]');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _rfromhn:['0','11'],
        _rtohn:['5','200']
    }), ['#','##','1##','2##'], '_rangetype + _rfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _rfromhn:['0','11'],
        _rtohn:['5','200']
    }), ['#','##','1##','2##'], '_rangetype + _rfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _lfromhn:['1'],
        _ltohn:['10'],
        _rfromhn:['1001'],
        _rtohn:['1200']

    }), ['#', '##','1###'], 'complex case A');

    assert.deepEqual(getHousenumRangeV3({
        _rangetype:'tiger',
        _rfromhn:['1'],
        _rtohn:['1000']
    }), ['#', '##','1##','1###','2##', '3##', '4##', '5##', '6##', '7##', '8##', '9##'], 'complex case B');

    assert.end();
});

