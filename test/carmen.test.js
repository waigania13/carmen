var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var carmen = require('..');

var fixtures = {
    'new york': [ -73.828125, 40.444817152078656, 8 ],
    'massachusetts': [ -71.015625, 41.506436201030766, 8 ],
    'boston, ma': [ -71.015625, 42.55093105330552, 8 ],
    'miami, fl': [ -79.453125, 25.163513002343066, 8 ]
};

describe('geocode', function() {
    _(fixtures).each(function(lonlat, query) {
        it(query, function(done) {
            carmen.geocode(query, function(err, res) {
                try { assert.deepEqual(lonlat, res.results[0].lonlat); }
                catch(err) { console.error(err); }
                done();
            });
        });
    });
});
