var crossStreets = require('../lib/verifymatch.js').crossStreets;
var tape = require('tape');

tape('Find intersection of two crossing LineStrings', function(assert) {
    var feature1 = {
        type: 'Feature',
        id:1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [5,0],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[5,0],[5,10]]
        }
    };
    var feature2 = {
        type: 'Feature',
        id:2,
        properties: {
            'carmen:text': 'main street',
            'carmen:center': [0,5],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0,5],[10,5]]
        }
    };

    var features = [feature1, feature2];
    var result = crossStreets(features);

    assert.equals(result[0]['properties']['carmen:text'], 'fake street & main street');
    assert.deepEquals(result[0]['geometry']['coordinates'], [5, 5]);
    assert.end();
});

tape('Find intersection of two touching LineStrings', function(assert) {
    var feature1 = {
        type: 'Feature',
        id:1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [5,0],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[5,0],[5,10]]
        }
    };
    var feature2 = {
        type: 'Feature',
        id:2,
        properties: {
            'carmen:text': 'main street',
            'carmen:center': [5,2],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[5,2],[10,2]]
        }
    };

    var features = [feature1, feature2];
    var result = crossStreets(features);

    assert.equals(result[0]['properties']['carmen:text'], 'fake street & main street');
    assert.deepEquals(result[0]['geometry']['coordinates'], [5, 2]);
    assert.end();
});

tape('No intersection for two parallel LineStrings', function(assert) {
    var feature1 = {
        type: 'Feature',
        id:1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [5,0],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[5,0],[5,10]]
        }
    };
    var feature2 = {
        type: 'Feature',
        id:2,
        properties: {
            'carmen:text': 'main street',
            'carmen:center': [0,6],
        },
        geometry: {
            type: 'LineString',
            coordinates: [[6,0],[6,10]]
        }
    };

    var features = [feature1, feature2];
    var result = crossStreets(features);

    assert.deepEquals(result, []);
    assert.end();
});
