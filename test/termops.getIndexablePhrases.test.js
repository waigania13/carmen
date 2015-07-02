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

test('termops.getIndexablePhrases (京都市)', function(assert) {
    var tokens;
    var freq;

    tokens = ['京都市'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: 3106018850, relev: 1, text: '京' },
        { degen: true, phrase: 2523610326, relev: 1, text: '京都' },
        { degen: true, phrase: 3849941224, relev: 1, text: '京都市' },
        { degen: false, phrase: 3849941225, relev: 1, text: '京都市' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (москва)', function(assert) {
    var tokens;
    var freq;

    tokens = ['москва'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: 3893112696, relev: 1, text: 'м' },
        { degen: true, phrase: 1647190324, relev: 1, text: 'мо' },
        { degen: true, phrase: 3567149362, relev: 1, text: 'мос' },
        { degen: true, phrase: 240336666, relev: 1, text: 'моск' },
        { degen: true, phrase: 4195145878, relev: 1, text: 'москв' },
        { degen: true, phrase: 2553908034, relev: 1, text: 'москва' },
        { degen: false, phrase: 2553908035, relev: 1, text: 'москва' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (josé)', function(assert) {
    var tokens;
    var freq;

    tokens = ['josé'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: 4010556028, relev: 1, text: 'j' },
        { degen: true, phrase: 1648323158, relev: 1, text: 'jo' },
        { degen: true, phrase: 3470006334, relev: 1, text: 'jos' },
        { degen: true, phrase: 4058142126, relev: 1, text: 'josé' },
        { degen: false, phrase: 4058142127, relev: 1, text: 'josé' }
    ]);

    assert.end();
});

