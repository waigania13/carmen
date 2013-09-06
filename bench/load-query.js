var JSCache = require('../cache');
var CXXCache = require('../lib/cxxcache');
var fs = require('fs');
var assert = require('assert');

var times = 100;
var max_shard = 2;

function getter(type, shard, file_ext) {
    return fs.readFileSync(__dirname + '/../test/fixtures/' + type + '.' + shard + file_ext);
};

var name = 'total time protobuf x';
console.time(name + times);
for (var i=0;i<times;++i) {
    console.time('  total');
    var cache = new CXXCache('a', 2);
    ['grid','term'].forEach(function(type) {
        for (var j=0;j<=max_shard;++j) {
            cache.load(getter(type,j,'.pbf'), type, j, 'protobuf');
        }
    });
    console.time('  3 gets');
    assert.deepEqual(cache.get('grid',52712469173248),[[104101,1100010900000591]]);
    assert.deepEqual(cache.get('grid',98071753006080),[[10996,1100005350000776,1100005350000775]]);
    assert.deepEqual(cache.get('grid',141956873251072),[[109619,1100010400000685]]);
    if (i==0) console.timeEnd('  3 gets');
    console.time('  30 gets');
    for (var j=0;j<30;++j) {
        assert.deepEqual(cache.get('grid',0),undefined);
    }
    if (i==0) console.timeEnd('  30 gets');
    if (i==0) console.timeEnd('  total');
}
console.timeEnd(name + times);

var name = 'total time js x';
console.time(name + times);
for (var i=0;i<times;++i) {
    console.time('  total');
    var cache = new JSCache('a', 2);
    ['grid','term'].forEach(function(type) {
        for (var j=0;j<=max_shard;++j) {
            cache.load(getter(type,j,'.json'), type, j, 'json');
        }
    });
    console.time('  3 gets');
    assert.deepEqual(cache.get('grid',52712469173248),[[104101,1100010900000591]]);
    assert.deepEqual(cache.get('grid',98071753006080),[[10996,1100005350000776,1100005350000775]]);
    assert.deepEqual(cache.get('grid',141956873251072),[[109619,1100010400000685]]);
    if (i==0) console.timeEnd('  3 gets');
    console.time('  30 gets');
    for (var j=0;j<30;++j) {
        assert.deepEqual(cache.get('grid',0),undefined);
    }
    if (i==0) console.timeEnd('  30 gets');
    if (i==0) console.timeEnd('  total');
}
console.timeEnd(name + times);
