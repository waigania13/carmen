var address = require('../lib/pure/applyaddress.js');
var addressCluster = require('../lib/pure/addresscluster.js');
var test = require('tape');

//@TODO


test('address.getReversePoint', function(assert) {
    assert.deepEqual(
        address.getReversePoint([-77.19932645559311,38.94770308373527], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19932038464033, 38.94757788890475 ], type: 'Point' }, properties: { dist: 0.008658996759104212, index: 0, travelled: 0.03554027081555206 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "left centre side of line"
    );

    assert.deepEqual(
        address.getReversePoint([-77.1995061635971,38.94741938611567], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.1995173939109, 38.947571055223044 ], type: 'Point' }, properties: { dist: 0.010499982934844238, index: 0, travelled: 0.024940051989783316 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "right centre side of line");

    assert.deepEqual(
        address.getReversePoint([-77.20057904720306,38.94761547135627], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: { dist: 0.03242169132910228, index: 0, travelled: 0 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "before start of line");

    assert.deepEqual(
        address.getReversePoint([-77.19858080148697,38.94759461125006], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: { dist: 0.013840773622621594, index: 0, travelled: 0.06147950790879972 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "after end of line");

    // assert.deepEqual(
    //     address.getReversePoint([-77.19932645559311,38.94770308373527], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
    //     null);

    assert.end();
});

test('address.lineIntersects', function(assert){
    assert.deepEqual(address.lineIntersects(0, 0, 5, 5, 5, 0, 0, 5), [2.5, 2.5]);
    assert.equal(address.lineIntersects(0, 0, 0, 5, 5, 0, 5, 5), false);
    assert.end();
});

test('address.standardize', function(assert){
    assert.equal(address.standardize({ _rangetype: 'canvec'}), undefined);
    assert.equal(address.standardize({ _rangetype: 'tiger' }), undefined);
    assert.equal(address.standardize({
        _rangetype: 'tiger',
        _geometry: {
            type: "Point" }
        }), undefined);
    assert.deepEqual(address.standardize({
        _rangetype: 'tiger',
        _geometry: {
            type: "LineString",
            coordinates: [[1,2], [2,3]] }
        }), { lf: [], lines: [ [ [ 1, 2 ], [ 2, 3 ] ] ], lp: [], lt: [], rf: [], rp: [], rt: [] });
    assert.deepEqual(address.standardize({
        _rangetype: 'tiger',
        _geometry: {
            type: "MultiLineString",
            coordinates: [[[1,2], [2,3]], [[5,6], [8,10]]] }
        }), { lf: [], lines: [ [ [ 1, 2 ], [ 2, 3 ] ], [ [ 5, 6 ], [ 8, 10 ] ] ], lp: [], lt: [], rf: [], rp: [], rt: [] });
    assert.deepEqual(address.standardize({
        _rangetype: 'tiger',
        _parityl: "E",
        _parityr: "O",
        _ltohn: 2,
        _lfromhn: 4,
        _rtohn: 1,
        _rfromhn: 3,
        _geometry: {
            type: "LineString",
            coordinates: [[1,2], [2,3]] }
            }), { lf: [ 4 ], lines: [ [ [ 1, 2 ], [ 2, 3 ] ] ], lp: [ 'E' ], lt: [ 2 ], rf: [ 3 ], rp: [ 'O' ], rt: [ 1 ] });
    assert.deepEqual(address.standardize({
        _rangetype: 'tiger',
        _parityl: ["E", "E"],
        _parityr: ["O", "O"],
        _ltohn: [2, 6],
        _lfromhn: [4, 8],
        _rtohn: [1, 5],
        _rfromhn: [3, 7],
        _geometry: {
            type: "MultiLineString",
            coordinates: [[[1,2], [2,3]], [[5,6], [8,10]]] }
        }), { lf: [ 4, 8 ], lines: [ [ [ 1, 2 ], [ 2, 3 ] ], [ [ 5, 6 ], [ 8, 10 ] ] ], lp: [ 'E', 'E' ], lt: [ 2, 6 ], rf: [ 3, 7 ], rp: [ 'O', 'O' ], rt: [ 1, 5 ] });
    assert.end();
});

test('address.det2D', function(assert) {
    assert.equal(address.det2D([0,0], [1,2], [3,4]), -2);
    assert.equal(address.det2D([0,0], [2,1], [-1,3]), 7);
    assert.equal(address.det2D([1,1], [0,1], [2,3]), -2);
    assert.equal(address.det2D([2,2], [0,-1], [-3,1]), -13);
    assert.end();
});

test('address.sign', function(assert) {
    assert.equal(address.sign(5), 1);
    assert.equal(address.sign(-5), -1);
    assert.equal(address.sign(0), 0);
    assert.end();
});

test('address.parseSemiNumber', function(assert) {
    assert.equal(address.parseSemiNumber('5'), 5);
    assert.equal(address.parseSemiNumber('5b'), 5);
    assert.equal(address.parseSemiNumber('asdf'), null);
    assert.end();
});

test('address.calculateDistance', function(assert) {
    assert.equal(address.calculateDistance([[0,0],[1,1]]), Math.sqrt(2));
    assert.equal(address.calculateDistance([[0,0],[0,0]]), 0);
    assert.end();
});

test('address.setPoint', function(assert) {
    assert.deepEqual(address.setPoint(2,0,8,[[0,0],[1,0]],false), {
        type: 'Point',
        coordinates:[0.25,0]
    }, 'x2, forward');
    assert.deepEqual(address.setPoint(2,8,0,[[0,0],[1,0]],false), {
        type: 'Point',
        coordinates:[0.75,0]
    }, 'x2, reverse');
    assert.deepEqual(address.setPoint(2,8,0,[[0,0],[0,0]],false), {
        type: 'Point',
        coordinates:[0,0]
    }, 'x2, identity (line)');
    assert.deepEqual(address.setPoint(0,0,0,[[0,0],[1,0]],false), {
        type: 'Point',
        coordinates:[0,0]
    }, 'x2, identity (address)');
   assert.deepEqual(address.setPoint(3,0,12,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        coordinates:[0.5,0]
    }, 'x3, forward');
    assert.deepEqual(address.setPoint(9,0,12,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        coordinates:[1.5,0]
    }, 'x3, reverse');
    assert.deepEqual(address.setPoint(9,0,12,[[0,0],[0,0],[0,0]],false), {
        type: 'Point',
        coordinates:[0,0]
    }, 'x3, identity (line)');
    assert.deepEqual(address.setPoint(0,0,0,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        coordinates:[0,0]
    }, 'x3, identity (address)');
    assert.end();
});

test('address interpolation - noop', function(t) {
    t.deepEqual(undefined, address({ _rangetype:'' }, 100));
    t.deepEqual(undefined, address({ _rangetype:'tiger' }, 100));
    t.deepEqual(undefined, address({ _rangetype:'tiger', _geometry: { type:'Point', coordinates:[-78,40] } }, 100));
    t.end();
});

 test('address interpolation - parity: even + both', function(t) {
    t.deepEqual({
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
     t.end();
});

test('address point clustering', function(t) {
    t.deepEqual(
        addressCluster(
            {
                _cluster: {
                    9: { type: "Point", coordinates: [1,1] },
                    10: { type: "Point", coordinates: [2,2] },
                    7: { type: "Point", coordinates: [0,0] }
                }
            }, 9),
        {
            type:'Point',
            coordinates:[1,1]
        });
    t.end();
});

test('reverse address point clustering', function(t) {
    t.deepEqual(
        addressCluster.reverse(
            {
                _text: "test",
                _cluster: {
                    9: { type: "Point", coordinates: [1,3] },
                    10: { type: "Point", coordinates: [2,4] },
                    7: { type: "Point", coordinates: [0,1] }
                },
                _geometry: { text: "MultiPoint Here" }
            }, [1,3]),
        {
            _cluster: { 10: { coordinates: [ 2, 4 ], type: 'Point' }, 7: { coordinates: [ 0, 1 ], type: 'Point' }, 9: { coordinates: [ 1, 3 ], type: 'Point' } },
            _geometry: { coordinates: [ 1, 3 ], type: 'Point' },
            _text: '9 test' });
    t.end();
});

test('address point clustering invalid coords', function(t) {
    t.deepEqual(
        addressCluster(
            {
                _cluster: {
                    9: { type: "Point", coordinates: [1,1,1] },
                    10: { type: "Point", coordinates: [2,2,2] },
                    7: { type: "Point", coordinates: [0,0,0] }
                }
            }, 9),
        undefined);
    t.end();
});

test('address point clustering not point', function(t) {
    t.deepEqual(
        addressCluster(
            {
                _cluster: {
                    9: { "type": "Polygon",
                        "coordinates": [
                            [
                                [
                                    -17.2265625,
                                    8.407168163601076
                                ],
                                [
                                    -17.2265625,
                                    53.9560855309879
                                ],
                                [
                                    34.80468749999999,
                                    53.9560855309879
                                ],
                                [
                                    34.80468749999999,
                                    8.407168163601076
                                ],
                                [
                                    -17.2265625,
                                    8.407168163601076
                                ]
                            ]
                        ] }
                }
            }, 9),
        undefined);
    t.end();
});

test('address point clustering fail', function(t) {
    t.deepEqual(
        addressCluster(
            {
                _cluster: {
                    9: { type: "Point", coordinates: [1,1] },
                    10: { type: "Point", coordinates: [2,2] },
                    7: { type: "Point", coordinates: [0,0] }
                }
            }, 11),
        undefined);
    t.end();
});

test('parity: even + even', function(t) {
    t.deepEqual({
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
    t.end();
});

test('parity: even + odd', function(t) {
    t.deepEqual({
        coordinates: [ 0, 9 ],
        omitted: true, // because parity does not match
        type: 'Point'
    }, address({
        _rangetype:'tiger',
        _lfromhn: '0',
        _ltohn: '100',
        _parityl: 'E',
        _geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,100]]
        }
    }, 9));
    t.end();
});

test('parity: odd + both', function(t) {
    t.deepEqual({
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
    t.end();
});

test('parity: odd + odd', function(t) {
    t.deepEqual({
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
    t.end();
});

test('parity: odd + even', function(t) {
    t.deepEqual({
        coordinates: [ 0, 9 ],
        omitted: true, // because parity does not match
        type: 'Point'
    }, address({
        _rangetype:'tiger',
        _lfromhn: '1',
        _ltohn: '101',
        _parityl: 'E',
        _geometry: {
            type:'LineString',
            coordinates:[[0,1],[0,101]]
        }
    }, 9));
    t.end();
});

test('reverse', function(t) {
    t.deepEqual({
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
    t.end();
});

test('seminumber', function(t) {
    t.deepEqual({
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
    t.end();
});

test('multi', function(t) {
    t.deepEqual([0,40.981964], address({
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
    t.end();
});

test('nearest', function(t) {
    t.deepEqual(address({
        _rangetype:'tiger',
        _lfromhn: '1000',
        _ltohn: '1100',
        _geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,100]]
        }
    }, 900), {
        coordinates: [ 0, 0 ],
        omitted: true, // because nearest endpoint match
        type: 'Point'
    }, 'nearest startpoint');

    t.deepEqual(address({
        _rangetype:'tiger',
        _lfromhn: '1000',
        _ltohn: '1100',
        _geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,100]]
        }
    }, 1200), {
        coordinates: [ 0, 100 ],
        omitted: true, // because nearest endpoint match
        type: 'Point'
    }, 'nearest endpoint');

    t.deepEqual(address({
        _rangetype:'tiger',
        _lfromhn: '1000',
        _ltohn: '1100',
        _geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,100]]
        }
    }, 2000),
    undefined,
    'outside threshold');
    t.end();
});
