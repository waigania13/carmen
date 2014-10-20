var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var termops = require('../lib/util/termops');

suite.add('termops', function() {
    var text = 'Chamonix-Mont-Blanc';
    var tokens = termops.tokenize(text);
    termops.phrase(tokens, '');
    termops.terms(tokens);
    termops.termsMap(tokens);
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();
