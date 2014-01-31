var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var CXXCache = require('../lib/util/cxxcache');
var fs = require('fs');

var bytes = require('bytes');

console.log(bytes(process.memoryUsage().rss))

function getter(term,shard,ext) {
    return fs.readFileSync(__dirname + '/fixtures/' + term+'-'+shard+ext);
}

var messages = [
    ['phrase',0,getter('phrase',0,'.pbf')],
    ['phrase',2,getter('phrase',2,'.pbf')],
    ['term',0,getter('term',0,'.pbf')],
    ['term',1,getter('term',1,'.pbf')],
    ['term',2,getter('term',2,'.pbf')]
]

function load_terms() {
    for (var i=0;i<100000;++i) {
        var cache = new CXXCache('a', 2);
        messages.forEach(function(msg) {
            cache.loadSync(msg[2], msg[0],msg[1]);
        });
    }
}

console.time('loading messages into cache');
load_terms()
console.timeEnd('loading messages into cache');
console.log(bytes(process.memoryUsage().rss))
