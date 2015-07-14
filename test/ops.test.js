var ops = require('../lib/util/ops');
var test = require('tape');

test('ops#toFeature', function(t) {
    t.deepEqual(ops.toFeature([
        {
            "_center": [-99.392855, 63.004759],
            "_text": "Canada, CA",
            "_extid": "country.1833980151",
            "_relevance": 1
        }
        ]), {
            id: 'country.1833980151',
            type: 'Feature',
            text: 'Canada',
            place_name: 'Canada',
            relevance: undefined,
            center: [ -99.392855, 63.004759 ],
            geometry: { type: 'Point', coordinates: [ -99.392855, 63.004759 ] },
            properties: {}
    });

    t.deepEqual(ops.toFeature([{
            "_center": [-99.392855,63.004759],
            "_address": 9,
            "_text": "Fake Street",
            "_extid": "country.1833980151",
            "_relevance": 1
        }], "{name} {num}"), { address: 9, center: [ -99.392855, 63.004759 ], geometry: { coordinates: [ -99.392855, 63.004759 ], type: 'Point' }, id: 'country.1833980151', place_name: 'Fake Street 9', properties: {}, relevance: undefined, text: 'Fake Street', type: 'Feature' });
    t.end();
});
