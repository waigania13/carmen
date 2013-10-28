var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite(),
    cache = require('../lib/cxxcache');

suite.add('shards', function() {
    cache.shards(4, []);
})
.add('zxy-cache', function() {
    cache.shards(4, []);
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run({ async: true });
