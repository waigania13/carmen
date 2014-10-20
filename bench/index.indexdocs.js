var Benchmark = require('benchmark');
var assert = require('assert');
var index = require('../lib/index');
var indexdocs = require('../lib/indexer/indexdocs');
var docs = require('../test/fixtures/docs.json');
var freq = index.generateFrequency(docs);
var patch = { grid: {}, term: {}, phrase: {}, degen: {}, feature: {} };
var known = { term: {} };
var zoom = 6;

var bench = new Benchmark('index', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs(docs, freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).on('cycle', function(event) {
	//console.log(JSON.stringify(event.target, null, 2))
	console.log(event.target.name 
		+ ' x ' 
		+ (event.target.hz * docs.length).toFixed(2) + ' docs/sec'
		+ ' (' + event.target.stats.sample.length 
		+ ' runs sampled)' );
})
.run();
