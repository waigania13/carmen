'use strict';
const tape = require('tape');
const BBox = require('../lib/util/bbox');

tape('check if polygons intersect', (t) => {
    const bb1 = [-75, 35, -65, 45];
    const bb2 = [-66, 34, -64, 44];
    const intersect = BBox.intersect(bb1, bb2);
    t.equal(intersect, true);
    t.end();
});

tape('check if polygons do not intersect', (t) => {
    const bb1 = [-75, 35, -65, 45];
    const bb2 = [-66, -34, -64, -44];
    const intersect = BBox.intersect(bb1, bb2);
    t.equal(intersect, false);
    t.end();
});
