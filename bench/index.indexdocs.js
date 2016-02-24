var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var index = require('../lib/index');
var indexdocs = require('../lib/indexer/indexdocs');
var docs = require('../test/fixtures/mem-docs.json');
var pointDoc = require('./fixtures/point-doc.json');
var freq = index.generateFrequency(docs, {});
var zoom = 6;
var pointDocs = [];

for(var i = 0; i < 500; i++) {
    pointDocs.push(pointDoc);
}

module.exports = benchmark;

function benchmark(cb) {
  if (!cb) cb = function(){};
  console.log('# index.indexdocs');
  suite.add('index many', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs(docs, freq, zoom, {}, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index large polygon', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([docs[4]], freq, zoom, {}, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index small polygon', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([docs[16]], freq, zoom, {}, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index point doc', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([pointDoc], freq, zoom, {}, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index many point docs', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs(pointDocs, freq, zoom, {}, function(err, res){
          deferred.resolve();
          indexdocs.teardown();
      });
    }
  })
  .on('complete', function(event) {
    suite.forEach(function(e) {
      console.log(e.name
        + ' x '
        + (e.hz).toFixed(2) + ' /sec'
        + ' (' + e.stats.sample.length
        + ' runs sampled)' );
      });
      console.log();
      cb(null, suite);
  })
  .run({'async': true});
}

if (!process.env.runSuite) benchmark();
