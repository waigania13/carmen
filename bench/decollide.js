var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var termops = require('../lib/util/termops');
var fs = require('fs');
var UPDATE = process.env.UPDATE;

var expected = require('./expected/decollide');
var values = {};

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
    var name = event.target.name;
    values[name] = event.target.hz;
    console.log(String(event.target));
    var compare = values[name]/expected[name];
    assert.ok(compare > 0.85);
    if (compare >= 1) console.log('  ', ((compare - 1) * 100).toFixed(2) + '%', 'faster than previously recorded');
    else console.log('  ', ((1 - compare) * 100).toFixed(2) + '%', 'slower than previously recorded');

})
.on('complete', function() {
    if (UPDATE) fs.writeFileSync(__dirname+'/expected/decollide.json', JSON.stringify(values, null, 2));
})
.run();