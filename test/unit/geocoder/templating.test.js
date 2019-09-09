const Handlebars = require('handlebars');
const tape = require('tape');
const Carmen = require('../../..');
const context = require('../../../lib/geocoder/context');
const mem = require('../../../lib/sources/api-mem');
const addFeature = require('../../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;


(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_address:1,
            geocoder_format: '{{address.number}} {{toUpper address.name}}, {{place.name}}, {{region.name}} {{postcode.name}}',
            geocoder_tokens: { 'Lane': 'La' }
        }, () => {})
    };
    const opts = {
        helper: {
            toUpper: function(str) {
                return str.toUpperCase();
            }
        }
    };
    const c = new Carmen(conf, opts);
    tape('set opts', (t) => {
        addFeature.setOptions(opts);
        t.end();
    });
    tape('index address', (t) => {
    const address = {
        id:1,
        properties: {
            'carmen:text': 'Quincy Lane',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['2169']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test template helper functions', (t) => {
        c.geocode('2169 Quincy Lane', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '2169 QUINCY LANE', 'uses helper functions to convert {address.name} toUpperCase');
            t.end();
        });
    });

    tape('unset opts', (t) => {
        addFeature.setOptions({});
        t.end();
    });
})();
