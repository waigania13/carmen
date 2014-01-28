var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var CXXCache = require('../lib/util/cxxcache');
var fs = require('fs');

function getter(term,shard,ext) {
    return fs.readFileSync(__dirname + '/fixtures/' + term+'-'+shard+ext);
}

var bench = new Benchmark('CXXCache Term',{
    'defer':true,
    'fn': function(deferred) {
        var cache = new CXXCache('a', 2);
        [['term',0],['term',1],['term',2]].forEach(function(msg) {
            cache.loadSync(getter(msg[0],msg[1],'.pbf'), msg[0],msg[1]);
        });
        deferred.resolve();        
    }
});
suite.add(bench)

var bench = new Benchmark('CXXCache Phrase',{
    'defer':true,
    'fn': function(deferred) {
        var cache = new CXXCache('a', 2);
        [['phrase',0],['phrase',2]].forEach(function(msg) {
            cache.loadSync(getter(msg[0],msg[1],'.pbf'), msg[0],msg[1]);
        });
        deferred.resolve();        
    }
});
suite.add(bench)

suite.on('cycle', function(event) {
  console.log(String(event.target));
})

suite.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})

suite.run();
