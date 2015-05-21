var proximity = require('../lib/util/proximity');
var test = require('tape');

test('proximity#toCenter', function(t) {
    t.deepEquals(proximity.toCenter([ -180, 0, 0, 85 ]), [ -10018754.171394622, 5236173.783920941 ]);
    t.deepEquals(proximity.toCenter([ -180, -85, 0, 0 ]), [ -10018754.171394622, -5236173.783920941 ]);
    t.deepEquals(proximity.toCenter([ 0, 0, 180, 85 ]), [ 10018754.171394622, 5236173.783920941 ]);
    t.deepEquals(proximity.toCenter([ -84, 40, -80, 40 ]), [ -9128198.245048434, 4865942.279503176 ]);
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

