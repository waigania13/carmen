var context = require('../lib/context');
var tape = require('tape');

tape('context.stackFeatures noop', function(assert) {
    assert.deepEqual(context.stackFeatures({}, [], {}), [], '0 features => []');
    assert.end();
});

tape('context.stackFeatures simple', function(assert) {
    var geocoderStub = {
        indexes: {
            country: { type:'country' },
            region: { type:'region' }
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['country'],
            'carmen:extid': 'country.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['region'],
            'carmen:extid': 'region.1'
        }
    }]};
    assert.deepEqual(context.stackFeatures(geocoderStub, loaded.features.slice(0), {}), {features: [loaded.features[1], loaded.features[0]]}, '2 features stacked');
    assert.end();
});

tape('context.stackFeatures type bump', function(assert) {
    var geocoderStub = {
        indexes: {
            country: { type:'country' },
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['country'],
            'carmen:extid': 'country.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['country'],
            'carmen:extid': 'country.2'
        }
    }]};
    assert.deepEqual(context.stackFeatures(geocoderStub, loaded.features.slice(0), {}), { features: [loaded.features[0]]}, '1 feature stacked, 1 bumped');
    assert.end();
});

tape('context.stackFeatures conflict', function(assert) {
    var geocoderStub = {
        indexes: {
            place: { type:'place' },
            address: { type:'address' }
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['place'],
            'carmen:extid': 'place.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['address'],
            'carmen:extid': 'address.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['poi'],
            'carmen:conflict': 'address',
            'carmen:extid': 'poi.1'
        }
    }]};
    assert.deepEqual(context.stackFeatures(geocoderStub, loaded.features.slice(0), {}), { features: [loaded.features[1], loaded.features[0]]}, '2 features stacked, 1 bumped');
    assert.end();
});

tape('context.stackFeatures conflict, dist tiebreak', function(assert) {
    var geocoderStub = {
        indexes: {
            place: { type:'place' },
            address: { type:'address' }
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['place'],
            'carmen:extid': 'place.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['address'],
            'carmen:extid': 'address.1',
            'carmen:vtquerydist': 10
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['poi'],
            'carmen:conflict': 'address',
            'carmen:extid': 'poi.1',
            'carmen:vtquerydist': 1
        }
    }]};
    assert.deepEqual(context.stackFeatures(geocoderStub, loaded.features.slice(0), {}), { features: [loaded.features[2], loaded.features[0]]}, '2 features stacked, 1 bumped, conflict priorities nearest feature');
    assert.end();
});

tape('context.stackFeatures multitype', function(assert) {
    var geocoderStub = {
        indexes: {
            region: { type:'region' },
            place: { type:'place' }
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['region','place'],
            'carmen:extid': 'region.1'
        }
    }]};
    var stacked = context.stackFeatures(geocoderStub, loaded.features.slice(0), {});
    assert.deepEqual(stacked, { features: [loaded.features[0]]}, '1 feature stacked, promoted');
    assert.deepEqual(stacked.features[0].properties['carmen:extid'], 'place.1', 'alters extid');
    assert.end();
});

tape('context.stackFeatures multitype, gap', function(assert) {
    var geocoderStub = {
        indexes: {
            region: { type:'region' },
            place: { type:'place' },
            poi: { type:'poi' }
        }
    };
    var loaded = { features: [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['region','place'],
                'carmen:extid': 'region.1'
            }
        }, {
            type: 'Feature',
            properties: {
                'carmen:types': ['poi'],
                'carmen:extid': 'poi.1'
            }
        }
    ]};
    var stacked = context.stackFeatures(geocoderStub, loaded.features.slice(0), {});
    assert.deepEqual(stacked, { features: [loaded.features[1],loaded.features[0]]}, '2 features stacked, 1 promoted');
    assert.deepEqual(stacked.features[0].properties['carmen:extid'], 'poi.1');
    assert.deepEqual(stacked.features[1].properties['carmen:extid'], 'place.1');
    assert.end();
});

tape('context.stackFeatures multitype, nogap', function(assert) {
    var geocoderStub = {
        indexes: {
            region: { type:'region' },
            place: { type:'place' },
            poi: { type:'poi' }
        }
    };
    var loaded = { features: [{
        type: 'Feature',
        properties: {
            'carmen:types': ['region','place'],
            'carmen:extid': 'region.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['place'],
            'carmen:extid': 'place.1'
        }
    }, {
        type: 'Feature',
        properties: {
            'carmen:types': ['poi'],
            'carmen:extid': 'poi.1'
        }
    }
    ]};
    var stacked = context.stackFeatures(geocoderStub, loaded.features.slice(0), {});
    assert.deepEqual(stacked, { features: [loaded.features[2],loaded.features[0]]}, '2 features stacked, 1 promoted');
    assert.deepEqual(stacked.features[0].properties['carmen:extid'], 'poi.1');
    assert.deepEqual(stacked.features[1].properties['carmen:extid'], 'place.1');
    assert.end();
});

