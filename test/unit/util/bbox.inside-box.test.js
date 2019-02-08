'use strict';
const tape = require('tape');
const BBox = require('../../../lib/util/bbox');

tape('check if point is inside bbox', (t) => {
    const coords = [-77, 38];
    const bbox = [-80, 30, -70, 40];
    t.assert(BBox.inside(coords, bbox));
    t.assert(BBox.amInside(coords, bbox));
    t.end();
});

tape('check if point is outside bbox', (t) => {
    const coords = [-87, 38];
    const bbox = [-80, 30, -70, 40];
    t.assert(!BBox.inside(coords, bbox));
    t.assert(!BBox.amInside(coords, bbox));
    t.end();
});

tape('check if point is inside AM-crossing bbox', (t) => {
    const coords1 = [175, 38];
    const coords2 = [-175, 38];
    const bbox = [170, 30, -170, 40];

    t.assert(BBox.amInside(coords1, bbox));
    t.assert(BBox.amInside(coords2, bbox));

    // contrast with:
    t.assert(!BBox.inside(coords1, bbox));
    t.assert(!BBox.inside(coords2, bbox));

    t.end();
});

tape('check if point is outside AM-crossing bbox', (t) => {
    const coords1 = [160, 38];
    const coords2 = [-160, 38];
    const bbox = [170, 30, -170, 40];

    t.assert(!BBox.amInside(coords1, bbox));
    t.assert(!BBox.amInside(coords2, bbox));

    // compare with:
    t.assert(!BBox.inside(coords1, bbox));
    t.assert(!BBox.inside(coords2, bbox));

    t.end();
});
