var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var verifymatch = require('../lib/verifymatch');
var loaded = require('./fixtures/verifymatch.verifyFeatures.loaded.json');
var spatial = require('./fixtures/verifymatch.verifyFeatures.spatial.json');
var tokens = require('./fixtures/tokens.json');
var token = require('../lib/util/token');
var replacer = token.createReplacer(tokens);

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# verifymatch.verifyFeatures');

    suite.add('verifymatch.verifyFeatures', function() {
        var l = JSON.parse(JSON.stringify(loaded));
        var query = ['1600','p'];
        var geocoder = { byidx: {} };

        for (var i = 0; i < 40; i++) geocoder.byidx[i] = {
            _geocoder: {
                token_replacer: replacer,
                geocoder_address: true
            }
        };
        var options = {
            proximity: [ -77.0414, 38.9004 ],
            debug: false,
            stats: true,
            limit: 5,
            allow_dupes: false,
            limit_verify: 10
        };
        verifymatch.verifyFeatures(query, geocoder, spatial, l, options);
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
      console.log();
      cb(null, suite);
    })
    .run();
}

if (!process.env.runSuite) benchmark();
