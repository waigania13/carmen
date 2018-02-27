'use strict';
const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.getIndexablePhrases', (t) => {
    const tokens = ['main', 'st'];
    const freq = {};
    freq['__COUNT__'] = [101];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        {
            'relev': 1,
            'text': 'main st',
            'phrase': termops.encodePhrase('main st'),
        },
        {
            'relev': 0.8,
            'text': 'main',
            'phrase': termops.encodePhrase('main'),
        }
    ]);

    t.end();
});


test('termops.getIndexablePhrases (weight sieve)', (t) => {
    const tokens = ['jose', 'de', 'la', 'casa'];
    const freq = {};
    freq['__COUNT__'] = [202];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];
    freq[termops.encodeTerm(tokens[2])] = [100];
    freq[termops.encodeTerm(tokens[3])] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq).map((p) => {
        return (p.relev) + '-1-' + p.text;
    }), [
        '1-1-jose de la casa',
        '1-1-jose de casa',
        '1-1-jose la casa',
        '0.8-1-jose casa'
    ]);

    t.end();
});

test('termops.getIndexablePhrases (京都市)', (t) => {
    const tokens = ['京都市'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { phrase: termops.encodePhrase('京都市', false), relev: 1, text: '京都市' }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (москва)', (t) => {
    const tokens = ['москва'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { phrase: termops.encodePhrase('москва', false), relev: 1, text: 'москва' }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (josé)', (t) => {
    const tokens = ['josé'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { phrase: termops.encodePhrase('josé'), relev: 1, text: 'jose' }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (josé, no degens)', (t) => {
    const tokens = ['josé'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { phrase: termops.encodePhrase('josé'), relev: 1, text: 'jose' }
    ]);

    t.end();
});
