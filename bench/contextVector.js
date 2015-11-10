var fs = require('fs');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var context = require('../lib/context');

var source = {
    getTile: function(z,x,y,callback) {
        return callback(null, fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbfz'), {
            'content-type': 'application/x-protobuf',
            'content-encoding': 'gzip'
        });
    },
    _geocoder: {
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        id: 'testA',
        idx: 1
    }
};

suite.add('context vector', {
	'defer': true,
	'fn': function(deferred) {
        context.contextVector(source, -97.4707, 39.4362, false, {}, null, function(err, data) {
    	    deferred.resolve();
        });
	}
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();