var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var termops = require('../lib/util/termops');
var fs = require('fs');

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# decollide');

    suite
    .add('decollide (collision)', function() {
        assert.equal(termops.decollide([], {
            properties: { 'carmen:text': 'r ademar da silva neiva #'}
        }, 'av francisco de aguirre # la serena'), false);
    })
    .add('decollide (clean)', function() {
        assert.equal(termops.decollide([], {
            properties: { 'carmen:text': 'av francisco de aguirre #'}
        }, 'av francisco de aguirre'), true);
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log();
        cb(null, this);
    })
    .run();
}

if (!process.env.runSuite) benchmark();

