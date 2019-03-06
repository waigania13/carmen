'use strict';
const tape = require('tape');
const BBox = require('../../../lib/util/bbox');

tape('check if polygons intersect', (t) => {
    const bb1 = [-75, 35, -65, 45];
    const bb2 = [-66, 34, -64, 44];
    t.assert(BBox.intersect(bb1, bb2));
    t.assert(BBox.amIntersect(bb1, bb2));
    t.deepEqual(BBox.intersection(bb1, bb2), [-66, 35, -65, 44]);
    t.end();
});

tape('check if polygons do not intersect', (t) => {
    const bb1 = [-75, 35, -65, 45];
    const bb2 = [-66, -44, -64, -34];
    t.assert(!BBox.intersect(bb1, bb2));
    t.assert(!BBox.amIntersect(bb1, bb2));
    t.deepEqual(BBox.intersection(bb1, bb2), false);
    t.end();
});

tape('test AM-crossing polygons that do intersect', (t) => {
    const amCrossing1 = [170, 35, -170, 45];
    const amCrossing2 = [178, 34, -169, 44];
    const western = [-175, 34, -169, 44];
    const eastern = [172, 34, 178, 44];

    t.assert(BBox.amIntersect(amCrossing1, amCrossing2));
    t.assert(BBox.amIntersect(amCrossing1, western));
    t.assert(BBox.amIntersect(amCrossing1, eastern));

    // to highlight the difference in behavior, these will fail with the regular
    // intersect calculator
    t.assert(!BBox.intersect(amCrossing1, amCrossing2));
    t.assert(!BBox.intersect(amCrossing1, western));
    t.assert(!BBox.intersect(amCrossing1, eastern));

    t.end();
});

tape('test AM-crossing polygons that do not intersect', (t) => {
    const amCrossing1 = [170, 35, -170, 45];
    const amCrossing2 = [178, -44, -169, -34];
    const western = [-175, -44, -169, -34];
    const eastern = [172, -44, 178, -34];

    t.assert(!BBox.amIntersect(amCrossing1, amCrossing2));
    t.assert(!BBox.amIntersect(amCrossing1, western));
    t.assert(!BBox.amIntersect(amCrossing1, eastern));

    t.assert(!BBox.intersect(amCrossing1, amCrossing2));
    t.assert(!BBox.intersect(amCrossing1, western));
    t.assert(!BBox.intersect(amCrossing1, eastern));

    t.end();
});
