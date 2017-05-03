// Tests bounds mask generation.

var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');

tape('boundsmask', function(t) {
    var conf = {
        small: new mem({maxzoom:6, geocoder_stack: ['west', 'east']}, function() {}),
        west: new mem({maxzoom:6, geocoder_stack: ['west']}, function() {}),
        east: new mem({maxzoom:6, geocoder_stack: ['east']}, function() {})
    };
    var c = new Carmen(conf);
    t.deepEqual(conf.small.bmask, [0,0,0], 'small overlaps with all');
    t.deepEqual(conf.west.bmask, [0,0,1], 'west overlaps with small');
    t.deepEqual(conf.east.bmask, [0,1,0], 'east overlaps with small');
    t.ok(c);
    t.end();
});

