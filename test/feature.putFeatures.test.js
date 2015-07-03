var tape = require('tape');
var feature = require('../lib/util/feature.js');
var Memsource = require('../lib/api-mem.js');
var Carmen = require('../index.js');

tape('putFeatures', function(assert) {
    var source = new Memsource(null, function(){});
    var carmen = new Carmen({source:source});
    feature.putFeatures(source, [
        {
            _id: 1,
            _hash: 1,
            _text: 'a',
            _center: [ 0, 0 ],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
        {
            _id: 2,
            _hash: 1,
            _text: 'b',
            _center: [ 0, 0 ],
            _geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        },
    ], function(err) {
        assert.ifError(err);
        assert.equal(source._shards.feature[0], '{"1":"{\\"1\\":{\\"_id\\":1,\\"_text\\":\\"a\\",\\"_center\\":[0,0],\\"_geometry\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]}},\\"2\\":{\\"_id\\":2,\\"_text\\":\\"b\\",\\"_center\\":[0,0],\\"_geometry\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]}}}"}');
        feature.getFeature(source, 1, function(err, data) {
            assert.equal(data[1]._id, 1);
            assert.equal(data[2]._id, 2);
            assert.end();
        });
    });
});

