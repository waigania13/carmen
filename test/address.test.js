var assert = require('assert');
var address = require('../lib/pure/applyaddress.js');

describe('address interpolation (tiger)', function() {
    it('noop', function() {
        assert.deepEqual(undefined, address({ _rangetype:'' }, 100));
        assert.deepEqual(undefined, address({ _rangetype:'tiger' }, 100));
        assert.deepEqual(undefined, address({ _rangetype:'tiger', _geometry: { type:'Point', coordinates:[-78,40] } }, 100));
    });
    it('parity: even + both', function() {
        assert.deepEqual({
            type:'Point',
            coordinates:[0,9]
        }, address({
            _rangetype:'tiger',
            _lfromhn: '0',
            _ltohn: '100',
            _geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        }, 9));
    });
    it('parity: even + even', function() {
        assert.deepEqual({
            type:'Point',
            coordinates:[0,10]
        }, address({
            _rangetype:'tiger',
            _lfromhn: '0',
            _ltohn: '100',
            _parityl: 'E',
            _geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        }, 10));
    });
    it('parity: even + odd', function() {
        assert.deepEqual(undefined, address({
            _rangetype:'tiger',
            _lfromhn: '0',
            _ltohn: '100',
            _parityl: 'E',
            _geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        }, 9));
    });
    it('parity: odd + both', function() {
        assert.deepEqual({
            type:'Point',
            coordinates:[0,9]
        }, address({
            _rangetype:'tiger',
            _lfromhn: '1',
            _ltohn: '101',
            _parityl: 'B',
            _geometry: {
                type:'LineString',
                coordinates:[[0,1],[0,101]]
            }
        }, 9));
    });
    it('parity: odd + odd', function() {
        assert.deepEqual({
            type:'Point',
            coordinates:[0,9]
        }, address({
            _rangetype:'tiger',
            _lfromhn: '1',
            _ltohn: '101',
            _parityl: 'O',
            _geometry: {
                type:'LineString',
                coordinates:[[0,1],[0,101]]
            }
        }, 9));
    });
    it('parity: odd + even', function() {
        assert.deepEqual(undefined, address({
            _rangetype:'tiger',
            _lfromhn: '1',
            _ltohn: '101',
            _parityl: 'E',
            _geometry: {
                type:'LineString',
                coordinates:[[0,1],[0,101]]
            }
        }, 9));
    });
    it('reverse', function() {
        assert.deepEqual({
            type: 'Point',
            coordinates: [0,90]
        }, address({
            _rangetype:'tiger',
            _lfromhn: '100',
            _ltohn: '0',
            _parityl: 'E',
            _geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        }, 10));
    });
    it('seminumber', function() {
        assert.deepEqual({
            type: 'Point',
            coordinates: [0,10]
        }, address({
            _rangetype:'tiger',
            _lfromhn: 'G-0',
            _ltohn: 'G-100',
            _parityl: 'E',
            _geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        }, 10));
    });
    it('multi', function() {
        assert.deepEqual([0,40.981964], address({
            _rangetype: 'tiger',
            _lfromhn: ['1002','2'],
            _ltohn: ['1998','1000'],
            _rfromhn: ['1001','1'],
            _rtohn: ['1999','999'],
            _parityr: ['O','O'],
            _parityl: ['E','E'],
            _geometry: {
                type:'MultiLineString',
                coordinates:[
                    [[0,0],[0,10]],
                    [[0,40],[0,50]]
                ]
            }
        }, 100).coordinates);
    });
});
