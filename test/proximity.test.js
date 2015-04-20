var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity#toCenter', function(t) {
    t.deepEquals(proximity.toCenter([ -180, 0, 0, 85 ]), [ -20037508.342789244, -19971868.88040857 ]);
    t.deepEquals(proximity.toCenter([ -180, -85, 0, 0 ]), [ -20037508.342789244, -19971868.88040857 ]);
    t.deepEquals(proximity.toCenter([ 0, 0, 180, 85 ]), [ -9462156.717428254, -19971868.88040857 ]);
    t.deepEquals(proximity.toCenter([ -84, 40, -80, 40 ]), [ -13803616.858365923, -7.081154551613622e-10 ]);
    t.end();
});

test('proximity#coarse', function(t) {
    t.deepEquals(
        proximity.coarse(
            [ 8760917240053761, 8760917240053762 ],
            [ [ 1, 33554434 ], [] ],
            [ 1, 6 ],
            { proximity: [ -60, -20 ] }
        ),
        [ 8760917240053762, 8760917240053761 ],
        'proximity - one layer'
    );

    t.deepEquals(
        proximity.coarse(
            [ 8760917240053763, 8760917273608193 ],
            [ [ 549755813891 ], [ 9346654142465 ] ],
            [ 1, 6 ],
            { proximity: [ -80, 40 ] }
        ),
        [ 8760917273608193, 8760917240053763 ],
        'proximity - accross layers'
    );
    t.end();
});

test('proximity#fine', function(t) {
    t.deepEquals(
        proximity.fine(
            { type: 'FeatureCollection',
              features: [
                {
                    id: 'layer.1',
                    relevance: 1
                },{
                    id: 'layer.2',
                    relevance: 0
                }] }
        ),
        { features: [ { id: 'layer.1', relevance: 1 }, { id: 'layer.2', relevance: 0 } ], type: 'FeatureCollection' },
        'short circuit different relev'
    );

    t.deepEquals(
        proximity.fine(
            { type: 'FeatureCollection',
              features: [
                {
                    id: 'layer.1',
                    relevance: 1
                },{
                    id: 'test.1',
                    relevance: 1
                }] }
        ),
        { features: [ { id: 'layer.1', relevance: 1 }, { id: 'test.1', relevance: 1 } ], type: 'FeatureCollection' },
        'short circuit different layers'
    );

    t.deepEquals(
        proximity.fine(
            { type: 'FeatureCollection',
              features: [
                {
                    id: 'layer.1',
                    relevance: 1,
                    center: [0,0]
                },{
                    id: 'layer.2',
                    relevance: 1,
                    center: [1,1]
                }] },
                { proximity: [0,0]}
        ),
        { features: [ { center: [ 0, 0 ], id: 'layer.1', relevance: 1 }, { center: [ 1, 1 ], id: 'layer.2', relevance: 1 } ], type: 'FeatureCollection' },        'sort on proximity'
    );

    t.deepEquals(
        proximity.fine(
            { type: 'FeatureCollection',
              features: [
                {
                    id: 'layer.1',
                    relevance: 1,
                    center: [0,0]
                },{
                    id: 'layer.2',
                    relevance: 1,
                    center: [1,1]
                }] },
                { proximity: [1,1]}
        ),
        { features: [ { center: [ 1, 1 ], id: 'layer.2', relevance: 1 }, { center: [ 0, 0 ], id: 'layer.1', relevance: 1 } ], type: 'FeatureCollection' },
        'sort on proximity'
    );

    t.end();
});
