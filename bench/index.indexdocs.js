var Benchmark = require('benchmark');
var assert = require('assert');
var index = require('../lib/index');
var indexdocs = require('../lib/indexer/indexdocs');
var docs = require('../test/fixtures/docs.json');
var pointDoc = require('./fixtures/point-doc.json')
var freq = index.generateFrequency(docs);
var patch = { grid: {}, term: {}, phrase: {}, degen: {}, feature: {} };
var known = { term: {} };
var zoom = 6;
var suite = new Benchmark.Suite()
var pointDocs = [];

for(var i = 0; i < 500; i++) {
	pointDocs.push(pointDoc);
}

suite.add('index many', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs(docs, freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).add('index large polygon', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs([docs[4]], freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).add('index small polygon', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs([docs[16]], freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).add('index point doc', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs([pointDoc], freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).add('index many point docs', {
  'defer': true,
  'fn': function(deferred) {
  	indexdocs(pointDocs, freq, zoom, function(err, res){
    	deferred.resolve();
    });
  }
}).on('cycle', function(event) {
	//console.log(JSON.stringify(event.target, null, 2))
	console.log(event.target.name 
		+ ' x ' 
		+ (event.target.hz).toFixed(2) + ' /sec'
		+ ' (' + event.target.stats.sample.length 
		+ ' runs sampled)' );
}).run();