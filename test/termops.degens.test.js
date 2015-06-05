var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('degens', function(assert) {
    var degens = termops.degens('foobarbaz');
    assert.deepEqual(degens, [
        1617781328, 1617781328,
        4112850176, 1617781329,
        2921073328, 1617781330,
        3214735712, 1617781331,
        967483776, 1617781332,
        1062237920, 1617781333,
        2851307216, 1617781334,
        1646454848, 1617781335
    ]);
    for (var i = 0; i < degens.length/2; i = i + 2) {
        // Encodes ID for 'foobarbaz'.
        assert.equal(degens[i+1] >>> 4 << 4 >>> 0, termops.terms(['foobarbaz'])[0]);
        // Encodes degen distance (max: 15) from foobarbaz.
        assert.ok(degens[i+1] % 16 <= 15);
    }

    // Does not generate degens for numeric terms.
    assert.deepEqual(termops.degens('1000'), [1000*16,1000*16]);
    assert.deepEqual(termops.degens('1000e'), [1000*16,1000*16]);

    assert.end();
});

