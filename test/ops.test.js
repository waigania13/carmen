var ops = require('../lib/util/ops');
var test = require('tape');

test('ops#toFeature', function(t) {
    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855, 63.004759],
            "carmen:text": "Canada, CA",
            "carmen:extid": "country.1833980151",
            "carmen:relevance": 1,
            "short_code": "ca"
        }
    }]), {
        id: 'country.1833980151',
        type: 'Feature',
        text: 'Canada',
        place_name: 'Canada',
        relevance: undefined,
        center: [ -99.392855, 63.004759 ],
        properties: { short_code: "ca" },
        geometry: { type: 'Point', coordinates: [ -99.392855, 63.004759 ] },
    });

    //Test Address formatting
    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    }], "{address._name} {address._number}"), { address: 9, center: [ -99.392855, 63.004759 ], geometry: { coordinates: [ -99.392855, 63.004759 ], type: 'Point' }, id: 'address.1833980151', place_name: 'Fake Street 9', properties: {}, relevance: undefined, text: 'Fake Street', type: 'Feature' });

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    }], "{address._number} {address._name}").place_name, '9 Fake Street', 'Address number & name exist');

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    }], "{address._number} {address._name}").place_name, 'Fake Street', 'Address number missing');

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    }], "{address._number} {address.name}").place_name, '9', 'Address name missing');

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Andor",
            "carmen:extid": "place.1"
        }
    }], "{address._number} {address._name}, {place._name}").place_name, '9 Fake Street, Andor', 'Address & Place');

    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Andor",
            "carmen:extid": "place.1"
        }
    }], "{address._number} {address._name}, {place.name}").place_name, '9 Fake Street', 'Address & no Place');


    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:address": 9,
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Andor",
            "carmen:extid": "place.1"
        }
    }], "{address._number} {address.name}, {place._name}").place_name, '9, Andor', 'No Address street & Place');


    t.deepEqual(ops.toFeature([{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Andor",
            "carmen:extid": "place.1"
        }
    }], "{address._number} {address.name}, {place._name}").place_name, 'Andor', 'Just place');

    //This stack used for the next series of tests
    var fullStack = [{
        properties: {
            "carmen:center": [-99.392855,63.004759],
            "carmen:text": "Fake Street",
            "carmen:extid": "address.1833980151",
            "carmen:relevance": 1
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Caemlyn",
            "carmen:extid": "place.1"
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "Andor",
            "carmen:extid": "region.1"
        }
    },{
        properties: {
            "carmen:center": [0,0],
            "carmen:text": "1234",
            "carmen:extid": "postcode.1"
        }
    },{
        properties: {
            "carmen:center": [ -99.392855, 63.004759 ],
            "carmen:text": "Canada",
            "carmen:extid": "country.1",
            "short_code": "ca"
        }
    }];

    t.deepEqual(ops.toFeature(fullStack, "{address._number} {address._name}, {place._name}, {region._name} {postcode._name}").place_name, 'Fake Street, Caemlyn, Andor 1234', 'Full stack');
    t.deepEqual(ops.toFeature(fullStack, "{address._number} {address._name}, {place.name}, {region._name} {postcode._name}").place_name, 'Fake Street, Andor 1234', 'Full stack');
    t.equals(ops.toFeature(fullStack).context.pop().short_code, 'ca', 'short_code property made it into context array');

    // Test language option
    t.deepEqual(ops.toFeature([{
        properties: {
            // Public properties
            'wikidata': 'Q172',
            // Internal text properties
            'carmen:text':'Toronto',
            'carmen:text_ru':'Торонто',
            'carmen:text_zh':'多伦多',
            // Internal score property
            'carmen:score': 1,
            // Public carmen properties
            "carmen:center": [0, 0],
            "carmen:extid": "place.1",
            "carmen:relevance": 1
        }
    }], {}, 'ru'), {
        id: 'place.1',
        type: 'Feature',
        text: 'Торонто',
        place_name: 'Торонто',
        relevance: undefined,
        center: [ 0, 0 ],
        properties: {
            wikidata: 'Q172'
        },
        geometry: {
            type: 'Point',
            coordinates: [ 0, 0 ]
        },
    });

    // Test dev option
    var input = {
        properties: {
            // Public properties
            wikidata: 'Q172',
            // Internal text properties
            'carmen:text':'Toronto',
            'carmen:text_ru':'Торонто',
            'carmen:text_zh':'多伦多',
            // Internal score property
            'carmen:score': 1,
            // Public carmen properties
            "carmen:center": [0, 0],
            "carmen:extid": "place.1",
            "carmen:relevance": 1
        }
    };
    t.deepEqual(ops.toFeature([input], {}, 'ru', true), {
        id: 'place.1',
        type: 'Feature',
        text: 'Торонто',
        place_name: 'Торонто',
        relevance: undefined,
        center: [ 0, 0 ],
        properties: input.properties,
        geometry: {
            type: 'Point',
            coordinates: [ 0, 0 ]
        },
    });

    t.end();
});
