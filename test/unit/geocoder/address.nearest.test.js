'use strict';
const addressItp = require('../../../lib/geocoder/addressitp');
const test = require('tape');

test('nearest', (t) => {
    t.deepEqual(addressItp.forward({
        type: 'Feature',
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 900), {
        type: 'Feature',
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            coordinates: [0, 0],
            interpolated: true,
            omitted: true, // because nearest endpoint match
            type: 'Point'
        }
    }, 'nearest startpoint');

    t.deepEqual(addressItp.forward({
        type: 'Feature',
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 1200), {
        type: 'Feature',
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            coordinates: [0, 100],
            interpolated: true,
            omitted: true, // because nearest endpoint match
            type: 'Point'
        }
    }, 'nearest endpoint');

    t.deepEqual(addressItp.forward({
        type: 'Feature',
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1000']],
            'carmen:ltohn': [['1100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 2000),
    undefined,
    'outside threshold');
    t.end();
});

test('nearest stability 1', (t) => {
    const a = addressItp.forward(require('../../fixtures/range-feature-1a.json'), 25);
    const b = addressItp.forward(require('../../fixtures/range-feature-1b.json'), 25);
    t.deepEqual(a.geometry, b.geometry);
    t.deepEqual(a.geometry.omitted, undefined, 'not omitted');
    t.end();
});

test('nearest stability 2', (t) => {
    const a = addressItp.forward(require('../../fixtures/range-feature-3a.json'), 625);
    const b = addressItp.forward(require('../../fixtures/range-feature-3b.json'), 625);
    t.deepEqual(a.geometry, b.geometry);
    t.deepEqual(a.geometry.coordinates, [-103.368341,20.665601]);
    t.deepEqual(a.geometry.omitted, undefined);
    t.deepEqual(b.geometry.omitted, undefined);
    t.end();
});

test('nearest stability 3', (t) => {
    const a = addressItp.forward(require('../../fixtures/range-feature-2a.json'), 100);
    const b = addressItp.forward(require('../../fixtures/range-feature-2b.json'), 100);
    t.deepEqual(a.geometry, b.geometry);
    t.deepEqual(a.geometry.omitted, undefined);
    t.deepEqual(b.geometry.omitted, undefined);
    t.end();
});

test('\'20 Molen Rd Ferron UT 84523\' doesn\'t return an interpolated result', (t) => {
    const a = addressItp.forward(require('../../fixtures/range-feature-4a.json'), 20);
    t.equal(a, undefined);
    t.end();
});
