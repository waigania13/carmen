var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var CXXCache = require('../lib/util/cxxcache');
var fs = require('fs');
var assert = require('assert');

var times = 1000;
var max_shard = 2;

function getter(type, shard, file_ext) {
    return fs.readFileSync(__dirname + '/../test/fixtures/' + type + '.' + shard + file_ext);
}

suite.add('CXXCache', function() {
    var cache = new CXXCache('a', 2);
    ['grid','term'].forEach(function(type) {
        for (var j=0;j<=max_shard;++j) {
            cache.load(getter(type,j,'.pbf'), type, j);
        }
    });
    assert.deepEqual(cache.get('grid',52712469173248),[599253667911333]);
    assert.deepEqual(cache.get('grid',98071753006080),[294145365125876,294145398680308]);
    assert.deepEqual(cache.get('grid',141956873251072),[571769031339059]);
    for (var j=0;j<30;++j) {
        assert.deepEqual(cache.get('grid',0),undefined);
    }
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();
