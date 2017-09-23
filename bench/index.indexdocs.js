const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const assert = require('assert');
const indexdocs = require('../lib/indexer/indexdocs');
const docs = require('../test/fixtures/mem-docs.json');
const pointDoc = require('./fixtures/point-doc.json');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const source = new mem({maxzoom: 6, geocoder_address:1 }, () => {});
const geocoder = new Carmen({ source: source });
const options = { zoom: 6 };
const pointDocs = [];

for (var i = 0; i < 500; i++) {
  pointDocs.push(pointDoc);
}

module.exports = benchmark;

function benchmark(cb) {
  if (!cb) cb = function(){};
  console.log('# indexdocs');
  suite.add('index many', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs(docs, source, options, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index large polygon', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([docs[4]], source, options, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index small polygon', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([docs[16]], source, options, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index point doc', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs([pointDoc], source, options, function(err, res){
        deferred.resolve();
      });
    }
  })
  .add('index many point docs', {
    'defer': true,
    'fn': function(deferred) {
      indexdocs(pointDocs, source, options, function(err, res){
        deferred.resolve();
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
