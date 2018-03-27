'use strict';
const tape = require('tape');
const BBox = require('../../../lib/util/bbox');

tape('check if point is inside polygon', (t) => {
    const coords = [-77, 38];
    const bbox = [-80, 30, -70, 40];
    const inside = BBox.inside(coords, bbox);
    t.equal(inside, true);
    t.end();
});

tape('check if point is outside polygon', (t) => {
    const coords = [-87, 38];
    const bbox = [-80, 30, -70, 40];
    const inside = BBox.inside(coords, bbox);
    t.equal(inside, false);
    t.end();
});
