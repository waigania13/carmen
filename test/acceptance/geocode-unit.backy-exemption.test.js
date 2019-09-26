// Pits an housenumber/street name/city query
// vs a similarly matching city/state/postcode result

'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        region: new mem({ maxzoom: 6 }, () => {}),
        place: new mem({ maxzoom: 6 }, () => {}),
        postcode: new mem({ maxzoom: 6,
            geocoder_format: '{{place.name}}, {{region.name}} {{postcode.name}}',
            geocoder_ignore_order: true
        },() => {}),
        address: new mem({
            maxzoom: 6,
            geocoder_address:1,
            geocoder_format: '{{address.number}} {{address.name}}, {{place.name}}, {{region.name}} {{postcode.name}}',
            geocoder_tokens: { 'Lane': 'La' }
        }, () => {}),
    };
    const c = new Carmen(conf);

    tape('index region', (assert) => {
        queueFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text': 'Massachusetts, MA',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index region', (assert) => {
        queueFeature(conf.region, {
            id:2,
            properties: {
                'carmen:text': 'Pennsylvania, PA',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('index place', (assert) => {
        // Quincy MA
        queueFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text': 'Quincy',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index place', (assert) => {
        // Linesville PA
        queueFeature(conf.place, {
            id:2,
            properties: {
                'carmen:text': 'Linesville',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('index postcode', (assert) => {
        // 02169 Quincy Mass
        queueFeature(conf.postcode, {
            id:1,
            properties: {
                'carmen:text': '02169',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index postcode', (assert) => {
        // 16424 Linesville PA
        queueFeature(conf.postcode, {
            id:2,
            properties: {
                'carmen:text': '16424',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('index address', (assert) => {
        // 2169 Quincy Lane Linesville PA
        queueFeature(conf.address, {
            id:2,
            properties: {
                'carmen:text': 'Quincy Lane',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['2169']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });


    tape('build', (assert) => { buildQueued(conf.region, assert.end); });
    tape('build', (assert) => { buildQueued(conf.place, assert.end); });
    tape('build', (assert) => { buildQueued(conf.postcode, assert.end); });
    tape('build', (assert) => { buildQueued(conf.address, assert.end); });

    tape('Search', (assert) => {
        c.geocode('Quincy MA 02169', {}, (err, res) => {
            assert.ifError(err);
            assert.deepEqual(res.features[0].place_name, 'Quincy, Massachusetts 02169', 'should match postcode/place/state first');
            assert.end();
        });
    });

    tape('Search', (assert) => {
        c.geocode('2169 Quincy Lane, 16424 Linesville, Pennsylvania', {}, (err, res) => {
            assert.ifError(err);
            c.geocode('2169 Quincy Lane, Linesville, Pennsylvania 16424', {}, (err, res_alt_order) => {
                assert.ifError(err);
                assert.deepEqual(res.features[0].place_name,
                    '2169 Quincy Lane, Linesville, Pennsylvania 16424',
                    'should match address first');
                assert.deepEqual(res_alt_order.features[0].place_name,
                    '2169 Quincy Lane, Linesville, Pennsylvania 16424',
                    'should match address first');
                assert.deepEqual(res.features[0].relevance, res_alt_order.features[0].relevance,
                    'full address searches should not be backy-penalized if exempt layer is out of order');
                assert.end();
            });
        });
    });

    tape('Search', (assert) => {
        // address, place, region, postcode
        c.geocode('2169 Quincy Lane, Linesville, Pennsylvania 16424', {}, (err, res) => {
            assert.ifError(err);

            // address, region, place, postcode
            c.geocode('2169 Quincy Lane, Pennsylvania Linesville 16424', {}, (err, res_alt_order) => {
                assert.ifError(err);
                assert.deepEqual(res.features[0].place_name,
                    '2169 Quincy Lane, Linesville, Pennsylvania 16424',
                    'should match address first');
                assert.deepEqual(res_alt_order.features[0].place_name,
                    '2169 Quincy Lane, Linesville, Pennsylvania 16424',
                    'should match address first');
                assert.ok(res.features[0].relevance > res_alt_order.features[0].relevance,
                    'full address searches should still be backy-penalized if non-exempt layers are out of order');

                // address, postcode, region, place
                c.geocode('2169 Quincy Lane, 16424 Pennsylvania Linesville', {}, (err, res_alt_alt_order) => {
                    assert.ifError(err);
                    assert.deepEqual(res_alt_alt_order.features[0].place_name,
                        '2169 Quincy Lane, Linesville, Pennsylvania 16424',
                        'should match address first');
                    assert.deepEqual(res_alt_order.features[0].relevance, res_alt_alt_order.features[0].relevance,
                        'full address searches should still be backy-penalized if non-exempt layers are out of order');
                    assert.end();
                });
            });
        });
    });

})();


tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
