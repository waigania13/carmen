// Interpolation check for addresses in close proximity to each other

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        address1: new mem({maxzoom: 6, geocoder_address: 1}, () => {}),
        address2: new mem({maxzoom: 6, geocoder_address: 1}, () => {})
    };
    const c1 = new Carmen(conf);
    tape('index address', (t) => {
        let address1 = {
            id:1,
            properties: {
                'carmen:text':'11 Austrasse',
                'carmen:center':[0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address1, address1, () => { buildQueued(conf.address1, t.end) });
    });
    tape('index address', (t) => {
        let address2 = {
            id:2,
            properties: {
                'carmen:text':'12 Austrasse',
                'carmen:center':[0,1]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates:[[0,1],[0,100]]
            }
        };
        queueFeature(conf.address2, address2, () => { buildQueued(conf.address2, t.end) });
    });
    tape('test addresses with similar names close to each other', (t) => {
        c1.geocode('0,1', { limit_verify: 4 }, (err, res) => {
            t.ifError(err);
            console.log('r', res);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
