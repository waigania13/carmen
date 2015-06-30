var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getIndexablePhrases', function(assert) {
    var tokens;
    var freq;

    tokens = ['main', 'st'];
    freq = {};
    freq[0] = [101];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        {
            "degen": true,
            "relev": 1,
            "text": "m",
            "phrase": 3893112696,
        },
        {
            "degen": true,
            "relev": 1,
            "text": "ma",
            "phrase": 1680745562,
        },
        {
            "degen": true,
            "relev": 1,
            "text": "mai",
            "phrase": 3869440694,
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main",
            "phrase": 3935363592,
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main s",
            "phrase": 2290296528,
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main st",
            "phrase": 2339755454,
        },
        {
            "degen": false,
            "relev": 1,
            "text": "main st",
            "phrase": 2339755455,
        },
        {
            "degen": false,
            "relev": 0.8,
            "text": "main",
            "phrase": 3935363593,
        }
    ]);

    assert.end();
});

