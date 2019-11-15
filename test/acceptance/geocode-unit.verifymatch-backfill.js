'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
const cheapRuler = require('cheap-ruler');

function roundTo(number, digits) {
    const multiplier = Math.pow(10, digits);
    return Math.round(number * multiplier) / multiplier;
}

function getCenter(polygonCoords) {
    const left = polygonCoords[0][0];
    const right =  polygonCoords[2][0];
    const bottom = polygonCoords[0][1];
    const top = polygonCoords[1][1];
    const x = roundTo(left + (right - left) / 2, 5);
    const y = roundTo(bottom + (top - bottom) / 2, 5);
    return [x, y];
}

// Generate coordinates for 50 small place polygons, each on a different z12 tile
// Generate 50 poi coordinates, each on the same z12 as the places, but that don't actually overlap
const placeCoordArr = [];
const otherCoordArr = [];
const poiCoordArr = [];
const tileWidth12 = 0.087890625; // this is roughly the width of a z12 tile
const boxSize = roundTo(tileWidth12 / 12, 5);
const offsetMeters = 3000;
const bottom = 0;
const top = boxSize;
let left = 0;
let right = boxSize;

for (let i = 0; i < 10; i++) {
    const placeCoords = [
        [left, bottom],
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom]
    ];
    placeCoordArr.push(placeCoords);
    // Get offset poi coords and place contexts to go with them
    const ruler = cheapRuler(top, 'meters');
    const poiCoords = ruler.offset(placeCoords[1], 0, offsetMeters); // Offset the top left corner of the place by 1100m
    poiCoordArr.push(poiCoords);
    const otherLeft = poiCoords[0];
    const otherBottom = poiCoords[1];
    const otherRight = otherLeft + boxSize;
    const otherTop = otherBottom + boxSize;
    const otherCoords = [
        [otherLeft, otherBottom],
        [otherLeft, otherTop],
        [otherRight, otherTop],
        [otherRight, otherBottom],
        [otherLeft, otherBottom]
    ];
    otherCoordArr.push(otherCoords);
    left = roundTo(right + tileWidth12, 5);
    right = roundTo(left + boxSize, 5);
}

const conf = {
    place: new mem({ maxzoom: 12 }, () => {}),
    poi: new mem({ maxzoom: 14 }, () => {})
};

const c = new Carmen(conf);

tape('index place', (t) => {
    const q = queue(1);
    placeCoordArr.forEach((placeCoords, i) => {
        q.defer((i, done) => {
            const feature = {
                id:i + 1,
                properties: {
                    'carmen:text':'place ' + (i + 1),
                    'carmen:center': getCenter(placeCoords),
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [placeCoords]
                }
            };
            queueFeature(conf.place, feature, done);
        }, i);
    });
    q.awaitAll(t.end);
});

tape('index other contexts', (t) => {
    const q = queue(1);
    otherCoordArr.forEach((otherCoords, i) => {
        q.defer((i, done) => {
            const id = 16 + i;
            const feature = {
                id: id,
                properties: {
                    'carmen:text':'other ' + (i + 1),
                    'carmen:center': getCenter(otherCoords),
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [otherCoords]
                }
            };
            queueFeature(conf.place, feature, done);
        }, i);
    });
    q.awaitAll(t.end);
});

tape('index poi', (t) => {
    const q = queue(1);
    poiCoordArr.forEach((poiCoords, i) => {
        q.defer((i, done) => {
            const feature = {
                id:i + 1,
                properties: {
                    'carmen:text': 'coffee',
                    'carmen:center': poiCoords
                },
                geometry: {
                    type: 'Point',
                    coordinates: poiCoords
                }
            };
            queueFeature(conf.poi, feature, done);
        }, i);

    });
    q.awaitAll(t.end);
});

tape('index expected poi', (t) => {
    const feature = {
        id:'11111',
        properties: {
            'carmen:text': 'coffee',
            'carmen:center': [-1,-1]
        },
        geometry: {
            type: 'Point',
            coordinates: [-1, -1]
        }
    };
    queueFeature(conf.poi, feature, t.end);
});

tape('index place that lines up spatially', (t) => {
    const feature = {
        id:'22222',
        properties: {
            'carmen:text': 'place',
            'carmen:center': [-1,-1],
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-2, -2], [-2, -0.5], [-0.5, -0.5], [-0.5, -2], [-2, -2]]]
        }
    };
    queueFeature(conf.place, feature, t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('Geocode', (t) => {
    c.geocode('coffee place', {}, (err, result) => {
        t.equal(result.features[0].id, 'poi.11111');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
