var ops = require('../lib/util/ops');
var test = require('tape');

test('ops#toFeature', function(t) {
    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855, 63.004759],
            "carmen:text": "Canada, CA",
            "carmen:extid": "country.1833980151",
            "carmen:relevance": 1
        }
    }]), {
        id: 'country.1833980151',
        type: 'Feature',
        properties: {
            text: 'Canada',
            place_name: 'Canada',
            relevance: undefined,
            center: [ -99.392855, 63.004759 ]
        },
        geometry: { type: 'Point', coordinates: [ -99.392855, 63.004759 ] }
    });

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "country.1833980151",
            "carmen:relevance": 1
        }
    }], "{name} {num}"), { geometry: { coordinates: [ -99.392855, 63.004759 ], type: 'Point' }, id: 'country.1833980151', properties: { address: 9, center: [ -99.392855, 63.004759 ], place_name: 'Fake Street 9', relevance: undefined, text: 'Fake Street' }, type: 'Feature' });
    t.end();
});
