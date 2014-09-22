var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var index = require('../lib/index');
var docs = require('../test/fixtures/docs.json');

var freq = index.generateFrequency(docs);
var patch = { grid: {}, term: {}, phrase: {}, degen: {}, feature: {} };
var known = { term: {} };

suite.add('index', function() {
    for (var i = 0; i < docs.length; i++) index.loadDoc(docs[i], freq, patch, known, 6);
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();
