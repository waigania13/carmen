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
            "phrase": termops.encodePhrase('m', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "ma",
            "phrase": termops.encodePhrase('ma', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "mai",
            "phrase": termops.encodePhrase('mai', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main",
            "phrase": termops.encodePhrase('main', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main s",
            "phrase": termops.encodePhrase('main s', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "main st",
            "phrase": termops.encodePhrase('main st', true),
        },
        {
            "degen": false,
            "relev": 1,
            "text": "main st",
            "phrase": termops.encodePhrase('main st', false),
        },
        {
            "degen": false,
            "relev": 0.8,
            "text": "main",
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
        '1-1-j',
        '1-1-jo',
        '1-1-jos',
        '1-1-jose',
        '1-1-jose d',
        '1-1-jose de',
        '1-1-jose de l',
        '1-1-jose de la',
        '1-1-jose de la c',
        '1-1-jose de la ca',
        '1-1-jose de la cas',
        '1-1-jose de la casa',
        '1-0-jose de la casa',
        '1-1-jose de c',
        '1-1-jose de ca',
        '1-1-jose de cas',
        '1-1-jose de casa',
        '1-0-jose de casa',
        '1-1-jose l',
        '1-1-jose la',
        '1-1-jose la c',
        '1-1-jose la ca',
        '1-1-jose la cas',
        '1-1-jose la casa',
        '1-0-jose la casa',
        '0.8-1-jose c',
        '0.8-1-jose ca',
        '0.8-1-jose cas',
        '0.8-1-jose casa',
        '0.8-0-jose casa'
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
        { degen: true, phrase: termops.encodePhrase('京', true), relev: 1, text: 'jing' },
        { degen: true, phrase: termops.encodePhrase('京都', true), relev: 1, text: 'jing du' },
        { degen: true, phrase: termops.encodePhrase('京都市', true), relev: 1, text: 'jing du shi' },
        { degen: false, phrase: termops.encodePhrase('京都市', false), relev: 1, text: 'jing du shi' }
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
        { degen: true, phrase: termops.encodePhrase('м', true), relev: 1, text: 'm' },
        { degen: true, phrase: termops.encodePhrase('мо', true), relev: 1, text: 'mo' },
        { degen: true, phrase: termops.encodePhrase('мос', true), relev: 1, text: 'mos' },
        { degen: true, phrase: termops.encodePhrase('моск', true), relev: 1, text: 'mosk' },
        { degen: true, phrase: termops.encodePhrase('москв', true), relev: 1, text: 'moskv' },
        { degen: true, phrase: termops.encodePhrase('москва', true), relev: 1, text: 'moskva' },
        { degen: false, phrase: termops.encodePhrase('москва', false), relev: 1, text: 'moskva' }
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
        { degen: true, phrase: termops.encodePhrase('j',true), relev: 1, text: 'j' },
        { degen: true, phrase: termops.encodePhrase('jo',true), relev: 1, text: 'jo' },
        { degen: true, phrase: termops.encodePhrase('jos',true), relev: 1, text: 'jos' },
        { degen: true, phrase: termops.encodePhrase('josé',true), relev: 1, text: 'jose' },
        { degen: false, phrase: termops.encodePhrase('josé',false), relev: 1, text: 'jose' }
    ]);

    assert.end();
});

