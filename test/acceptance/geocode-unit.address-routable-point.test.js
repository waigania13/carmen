// Tests whether routable_points is added to geocoding results
'use strict';
const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Test non-interpolated address routable_points
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.111, 1.11],
                                [1.112, 1.11],
                                [1.114, 1.11],
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for non-interpolated address and return routable points', (t) => {
        c.geocode('9 fake street', { debug: true, routingMode: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [1.111, 1.11] }]
                },
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('Geocode for non-interpolated address without routingMode', (t) => {
        c.geocode('9 fake street', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward geocode without routingMode: true does not set routable_points on response'
            );
            t.end();
        });
    });
})();


// Test interpolated address
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {

        const address = {
            id: '7654',
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street',
                'carmen:center': [-97.2, 37.3],
                'carmen:score': 99,
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': ['100'],
                'carmen:ltohn': ['200'],
                'carmen:rfromhn': ['101'],
                'carmen:rtohn': ['199'],
                'carmen:parityl': ['E'],
                'carmen:parityr': ['O'],
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-97.2, 37.2],
                        [-97.2, 37.4]
                    ]
                ]
            }
        };

        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for interpolated address', (t) => {
        c.geocode('150 Main Street', { routingMode: true, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                [{ coordinates: res.features[0].geometry.coordinates }],
                'Forward geocode of interpolated address result should return existing coordinates'
            );
            t.end();
        });
    });
})();


// Test feature that doesn't have linestring data
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9','10','7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for address with no LineString data', (t) => {
        c.geocode('9 fake street', { routingMode: true, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                null,
                'Forward geocode of address with no LineString data returns no routable_points');
            t.end();
        });
    });

})();


// Test POI
(() => {
    const conf = {
        poi : new mem({ maxzoom: 6 }, () => {})
    };
    const c = new Carmen(conf);

    tape('index POI', (t) => {
        const poi = {
            'type': 'Feature',
            'id': 6666777777982370,
            'geometry': {
                'type': 'Point',
                'coordinates': [-122.22083333333, 37.721388888889]
            },
            'properties': {
                'carmen:center': [-122.22083, 37.72139],
                'carmen:geocoder_stack': 'us',
                'carmen:score': 196,
                'landmark': true,
                'wikidata': 'Q1165584',
                'carmen:text_universal': 'OAK',
                'tel': '(510) 563-3300',
                'category': 'airport',
                'address': '1 Airport Dr',
                'carmen:text': 'Oakland International Airport,OAK,KOAK, Metropolitan Oakland International Airport, airport'
            }
        };
        queueFeature(conf.poi, poi, () => { buildQueued(conf.poi, t.end); });
    });

    tape('Forward search for POI with routingMode', (t) => {
        c.geocode('Oakland International Airport', { routingMode: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                null,
                'Forward search for POI returns found: false, supported_type: false, and points: null'
            );
            t.end();
        });
    });

    tape('Forward search for POI without routingMode', (t) => {
        c.geocode('Oakland International Airport', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward search for POI without routingMode does not return routable_points'
            );
            t.end();
        });
    });
})();


// Test reverse geocoding
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.111, 1.11],
                                [1.112, 1.11],
                                [1.114, 1.11],
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Reverse geocode with routingMode', (t) => {
        c.geocode('1.111, 1.111', { routingMode: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: null
                },
                'Reverse geocode with routingMode sets routable_points.points to false'
            );
            t.end();
        });
    });
    tape('Reverse geocode without routingMode', (t) => {
        c.geocode('1.111, 1.111', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Reverse geocode without routingMode does not set routable_points'
            );
            t.end();
        });
    })
})();
