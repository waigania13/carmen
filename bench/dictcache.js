var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var Dictcache = require('../lib/util/dictcache');
var encodePhrase = require('../lib/util/termops').encodePhrase;

var hashes = [];
var dict = new Dictcache();
// fuzz test
for (var i = 0; i < 10000; i++) {
    hashes.push(encodePhrase([Math.random().toString()]));
}

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# dictcache.Dictcache');

    suite.add('Dictcache', function() {
        for (var i = 0; i < hashes.length; i++) {
            var id = hashes[i];
            dict.has(id);
            dict.set(id);
            dict.del(id);
        }
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').pluck('name'), '\n');
      cb(null, suite);
    })
    .run();
}

if (!process.env.runSuite) benchmark();
