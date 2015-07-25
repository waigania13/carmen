// Tests bounds mask generation.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

tape('boundsmask', function(assert) {
    var conf = {
        small: new mem({maxzoom:6, bounds:[-10,-10,10,10]}, function() {}),
        west: new mem({maxzoom:6, bounds:[-180,-85,-1,85]}, function() {}),
        east: new mem({maxzoom:6, bounds:[1,-85,180,85]}, function() {})
    };
    var c = new Carmen(conf);
    assert.deepEqual(conf.small._geocoder.bmask, [0,0,0], 'small overlaps with all');
    assert.deepEqual(conf.west._geocoder.bmask, [0,0,1], 'west overlaps with small');
    assert.deepEqual(conf.east._geocoder.bmask, [0,1,0], 'east overlaps with small');
    assert.end();
});

