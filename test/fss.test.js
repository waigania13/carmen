var fss = require('../lib/_fss.node');
var assert = require('assert');

describe('fss', function() {
    it('should work', function(done) {
        var engine = new fss.Engine();
        engine.add({file:'/Users/artem/Projects/fss/data/places.txt',distance:2});
        var results = engine.search({query:"Oxfordd Street", distance:2, num_results:3});
        console.log(results);
        done();
    });
});
