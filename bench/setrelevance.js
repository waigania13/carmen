var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var getSetRelevance = require('../lib/pure/setrelevance');

suite.add('setrelevance', function() {
    // @TODO worst case scenario this data
    assert.equal(1, getSetRelevance(['georgia','vermont'], [
        { id: 3553, relev: 1, reason: 2, count: 1, idx: 1, db: 'province', tmpid: 100000000003553 },
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 2, db: 'place', tmpid: 300000000130305 }
    ]));
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.run();
