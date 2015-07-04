var tape = require('tape');
var feature = require('../lib/util/feature.js');
var Memsource = require('../lib/api-mem.js');
var Carmen = require('../index.js');

var source = new Memsource(null, function(){});
var carmen = new Carmen({source:source});

tape('putFeatures', function(assert) {
    feature.putFeatures(source, [
        {
            _id: 1,
            _text: 'a',
            _center: [ 0, 0 ],
            _zxy: ['6/32/32'],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
        {
            _id: 2,
            _text: 'b',
            _center: [ 0, 0 ],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
        {
            _id: Math.pow(2,20) + 1,
            _text: 'c',
            _center: [360/64+0.001,0],
            _zxy: ['6/33/32'],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
    ], function(err) {
        assert.ifError(err);
        assert.equal(source._shards.feature[0], '{"1":"{\\"1\\":{\\"_id\\":1,\\"_text\\":\\"a\\",\\"_center\\":[0,0],\\"_zxy\\":[\\"6/32/32\\"],\\"_geometry\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]}},\\"1048577\\":{\\"_id\\":1048577,\\"_text\\":\\"c\\",\\"_center\\":[5.626,0],\\"_zxy\\":[\\"6/33/32\\"],\\"_geometry\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]}}}","2":"{\\"2\\":{\\"_id\\":2,\\"_text\\":\\"b\\",\\"_center\\":[0,0],\\"_geometry\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]}}}"}');
        assert.end();
    });
});

tape('getFeatureByCover', function(assert) {
    feature.getFeatureByCover(source, { id:1, x:32, y:32 }, function(err, data) {
        assert.equal(data._id, 1);
        assert.end();
    });
});

tape('getFeatureByCover', function(assert) {
    feature.getFeatureByCover(source, { id:1, x:33, y:32 }, function(err, data) {
        assert.equal(data._id, 1048577);
        assert.end();
    });
});

tape('getFeatureById', function(assert) {
    feature.getFeatureById(source, 1, function(err, data) {
        assert.equal(data._id, 1);
        assert.end();
    });
});

