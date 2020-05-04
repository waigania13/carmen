'use strict';
const tape = require('tape');
const feature = require('../../../lib/util/feature.js');

tape('storableProperties', (t) => {
    const featProperties = {
        // Should be stored
        'noncarmenproperty': 'not a carmen property',
        'carmen:text': 'a',
        'carmen:text_en': 'a',
        'carmen:center': [0, 0],
        'carmen:zxy': ['6/32/32'],
        'carmen:format_es': '{{address.number}} {{address.name}}, {{place.name}}, {{country.name}}',
        'carmen:score': 5,
        'carmen:proximity_radius': 1000,
        // Should not be stored
        'carmen:newproperty': 'new property',
    };
    const properties = feature.storableProperties(featProperties);
    t.ok(properties['noncarmenproperty'], 'property not prefixed with Carmen should be stored.');
    t.ok(properties['carmen:text'], 'carmen:text property should be stored.');
    t.ok(properties['carmen:text_en'], 'carmen:text_* language properties should be stored.');
    t.ok(properties['carmen:center'], 'carmen:center should be stored.');
    t.ok(properties['carmen:format_es'], 'carmen:format_* address formats should be stored.');
    t.ok(properties['carmen:score'], 'carmen:score should be stored.');
    t.ok(properties['carmen:proximity_radius'], 'carmen:proximity_radius should be stored.');
    t.notOk(properties['carmen:newproperty'], 'carmen properties not explicitly allowed should not be stored.');
    t.end();
});
