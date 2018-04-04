'use strict';
const tape = require('tape');
const BBox = require('../../../lib/util/bbox');

tape('should convert bbox to xyz coords', (t) => {
    const bbox = [-78, 38, -76, 40];
    const zoom = 5;
    const converted = BBox.insideTile(bbox, zoom);
    const xyz = [5, 9, 12, 9, 12];
    t.deepEqual(converted, xyz);
    t.end();
});
