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
            "phrase": 1745629049
        },
        {
            "degen": true,
            "relev": 1,
            "text": "ma",
            "phrase": 1680745564
        },
        {
            "degen": true,
            "relev": 1,
            "text": "mai",
            "phrase": 1721957047
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main",
            "phrase": 1787879945
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main s",
            "phrase": 142812882
        },
        {
            "degen": false,
            "relev": 1,
            "text": "main st",
            "phrase": 192271807
        },
        {
            "degen": false,
            "relev": 0.8,
            "text": "main",
            "phrase": 1787879944
        }
    ]);

    assert.end();
});

