var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getIndexablePhrases',
function(assert) {
    var tokens;
    var freq;

    tokens = ['main', 'st'];
    freq = {};
    freq[0] = [101];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true,  phrase: 4464293334551456, relev: 1, text: 'xm' },
        { degen: true,  phrase: 2379090569199334, relev: 1, text: 'xma' },
        { degen: true,  phrase: 189308459921992,  relev: 1, text: 'xmai' },
        { degen: true,  phrase: 3839096397287854, relev: 1, text: 'xmain' },
        { degen: true,  phrase: 1380496622738168, relev: 1, text: 'xmain s' },
        { degen: true,  phrase: 3316517807337716, relev: 1, text: 'xmain st' },
        { degen: false, phrase: 3316517807337717, relev: 1, text: 'xmain st' },
        { degen: false, phrase: 3839096397287855, relev: 0.8, text: 'xmain' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (weight sieve)',
function(assert) {
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
        return (p.relev) + '-' + (p.degen ? 1 : 0) + '-' + p.text;}), [
            '1-1-xj',
            '1-1-xjo',
            '1-1-xjos',
            '1-1-xjose',
            '1-1-xjose d',
            '1-1-xjose de',
            '1-1-xjose de l',
            '1-1-xjose de la',
            '1-1-xjose de la c',
            '1-1-xjose de la ca',
            '1-1-xjose de la cas',
            '1-1-xjose de la casa',
            '1-0-xjose de la casa',
            '1-1-xjose de c',
            '1-1-xjose de ca',
            '1-1-xjose de cas',
            '1-1-xjose de casa',
            '1-0-xjose de casa',
            '1-1-xjose l',
            '1-1-xjose la',
            '1-1-xjose la c',
            '1-1-xjose la ca',
            '1-1-xjose la cas',
            '1-1-xjose la casa',
            '1-0-xjose la casa',
            '0.8-1-xjose c',
            '0.8-1-xjose ca',
            '0.8-1-xjose cas',
            '0.8-1-xjose casa',
            '0.8-0-xjose casa'
        ]);

    assert.end();
});

test('termops.getIndexablePhrases (京都市)',
function(assert) {
    var tokens;
    var freq;

    tokens = ['京都市'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true,  phrase: 1191219065693314, relev: 1, text: 'zjing' },
        { degen: true,  phrase: 2951522531051300, relev: 1, text: 'zjing du' },
        { degen: true,  phrase: 2426043232375396, relev: 1, text: 'zjing du shi' },
        { degen: false, phrase: 2426043232375397, relev: 1, text: 'zjing du shi' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (москва)',
function(assert) {
    var tokens;
    var freq;

    tokens = ['москва'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true,  phrase: 4464293334551456, relev: 1, text: 'xm' },
        { degen: true,  phrase: 1628373399456934, relev: 1, text: 'xmo' },
        { degen: true,  phrase: 4371458068741588, relev: 1, text: 'xmos' },
        { degen: true,  phrase: 3378241799793880, relev: 1, text: 'xmosk' },
        { degen: true,  phrase: 1830243779221072, relev: 1, text: 'xmoskv' },
        { degen: true,  phrase: 2701985127843730, relev: 1, text: 'xmoskva' },
        { degen: false, phrase: 2701985127843731, relev: 1, text: 'xmoskva' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (josé)',
function(assert) {
    var tokens;
    var freq;

    tokens = ['josé'];
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true,  phrase: 1924954629254264, relev: 1, text: 'xj' },
        { degen: true,  phrase: 4361756513105482, relev: 1, text: 'xjo' },
        { degen: true,  phrase: 3026184436766190, relev: 1, text: 'xjos' },
        { degen: true,  phrase: 718358883714634,  relev: 1, text: 'xjose' },
        { degen: false, phrase: 718358883714635,  relev: 1, text: 'xjose' }
    ]);

    assert.end();
});

