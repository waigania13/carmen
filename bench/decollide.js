var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var termops = require('../lib/util/termops');

suite
.add('decollide (collision)', function() {
    assert.equal(termops.decollide([
        [ '#', 'r', 'ademar', 'da', 'silva', 'neiva' ],
        [ 'r', 'ademar', 'da', 'silva', 'neiva', '#' ]
    ], 'av francisco de aguirre # la serena'), false);
})
.add('decollide (clean)', function() {
    assert.equal(termops.decollide([
        [ '#', 'av', 'francisco', 'de', 'aguirre' ],
        [ 'av', 'francisco', 'de', 'aguirre', '#' ]
    ], 'av francisco de aguirre #'), true);
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();

