var crossStreets = require('../lib/verifymatch.js').crossStreets;
var tape = require('tape');



tape('Find intersection of two line features', function(assert) {
    // given the geometries of two line features, return a feature matching the intersection
    // currently returns a feature with combined name only
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
    console.log(result);

    assert.equals(result[0]['properties']['carmen:text'], 'fake street & main street');
    assert.equals(result[0]['geometry']['coordinates'], [5, 5]);

    assert.end();
});
