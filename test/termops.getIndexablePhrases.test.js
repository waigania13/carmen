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
            "degen": false,
            "relev": 1,
            "text": "xmain st",
            "phrase": termops.encodePhrase('main st', false),
        },
        {
            "degen": false,
            "relev": 0.8,
            "text": "xmain",
            "phrase": termops.encodePhrase('main', false),
        }
    ]);

    assert.end();
});


test('termops.getIndexablePhrases (weight sieve)', function(assert) {
    var tokens;
    var freq;

    tokens = ['jose', 'de', 'la', 'casa'];
    freq = {};
    freq[0] = [202];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];
    freq[termops.encodeTerm(tokens[2])] = [100];
    freq[termops.encodeTerm(tokens[3])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq).map(function(p) {
        return (p.relev) + '-' + (p.degen ? 1 : 0) + '-' + p.text;
    }), [
        '1-0-xjose de la casa',
        '1-0-xjose de casa',
        '1-0-xjose la casa',
        '0.8-0-xjose casa'
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
        { degen: false, phrase: termops.encodePhrase('京都市', false), relev: 1, text: 'zjing du shi' }
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
        { degen: false, phrase: termops.encodePhrase('москва', false), relev: 1, text: 'xmoskva' }
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
        { degen: false, phrase: termops.encodePhrase('josé',false), relev: 1, text: 'xjose' }
    ]);

    assert.end();
});
