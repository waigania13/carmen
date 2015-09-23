var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var CXXCache = require('../lib/util/cxxcache');
var fs = require('fs');

function getter(term,shard,ext) {
    return fs.readFileSync(__dirname + '/fixtures/' + term+'-'+shard+ext);
}

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# load-query-compare');

    suite.add('CXXCache Term', function() {
        var cache = new CXXCache('a', 2);
        [['term',0],['term',1],['term',2]].forEach(function(msg) {
            cache.loadSync(getter(msg[0],msg[1],'.pbf'), msg[0],msg[1]);
        });
    })
    .add('CXXCache Phrase', function() {
        var cache = new CXXCache('a', 2);
        [['phrase',0],['phrase',2]].forEach(function(msg) {
            cache.loadSync(getter(msg[0],msg[1],'.pbf'), msg[0],msg[1]);
        });
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + suite.filter('fastest').pluck('name'), '\n');
      cb(null, suite);
    })
    .run();
}

if (!process.env.runSuite) benchmark();
