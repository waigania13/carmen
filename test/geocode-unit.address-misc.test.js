// Alphanumeric and hyphenated housenumbers

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

/*
 * Perform a reverse geocode with a street segment that looks like
 * (. is pt addr. -- is itp addr)
 *
 *      . . . . . . . .
 *      ------------------------------------
 *                                  x
 * We want to prioritze returning a '.' where it is sensible
 * But in this case it's pretty far away so we should return --
 * even though the feature has '.'s
*/

(() => {
    const conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text': 'Vandwellers Paradise',
                'carmen:center': [-95.4114122, 29.8119148],
                'carmen:zxy': ['6/15/26'],
                'carmen:addressnumber': [['100'], null],
                "carmen:rangetype": "tiger",
                "carmen:parityl": [ null, [ 'O', 'O' ]],
                "carmen:lfromhn": [ null, [  1,  11 ]],
                "carmen:ltohn": [ null,   [  9,  19 ]],
                "carmen:parityr": [ null, [ 'E', 'E' ]],
                "carmen:rfromhn": [ null, [  2,  10 ]],
                "carmen:rtohn": [ null,   [  8,  18 ]]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [
                        [-95.41416764259338,29.812134548414665]
                    ]
                },{
                    type: "MultiLineString",
                    coordinates: [[
                        [ -95.41481137275696, 29.81182735147623 ],
                        [ -95.41242957115172, 29.81191113255303 ]
                    ],[
                        [ -95.42544364929198, 29.81085920949646 ],
                        [ -95.42282581329346, 29.810896445899782 ]
                    ]]
                }]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test address index for alphanumerics', (t) => {
        c.geocode('-95.42578,29.810561', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '10 Vandwellers Paradise', 'Matched ITP');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
