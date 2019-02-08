'use strict';
const token = require('../../../lib/text-processing/token.js');
const test = require('tape');
const WORD_BOUNDARY = token.WORD_BOUNDARY;

// From https://stackoverflow.com/a/10776635
function regexEqual(x, y) {
    return (x instanceof RegExp) && (y instanceof RegExp) &&
       (x.source === y.source) && (x.global === y.global) &&
       (x.ignoreCase === y.ignoreCase) && (x.multiline === y.multiline);
}

test('createReplacer: simple token replacements', (t) => {
    const replacer = token.createSimpleReplacer({
        'Street': 'St',
        'Road': 'Rd',
        'Maréchal': 'Mal'
    });

    t.ok(replacer.tokens instanceof Map);
    t.equal(typeof replacer.replacer, 'function');

    t.deepEqual(replacer.replacer(['Fake', 'Street']), ['Fake', 'Street'], 'Requires input be lowercase');
    t.deepEqual(replacer.replacer(['fake', 'street']), ['fake', 'st'], 'fake street => fake St');
    t.end();
});

test('createReplacer: includeUnambiguous', (t) => {
    const replacer = token.createComplexReplacer({
        'Street': 'St'
    }, { includeUnambiguous: true });

    const expected =  [{
        from: new RegExp('(' + WORD_BOUNDARY + '|^)Street(' + WORD_BOUNDARY + '|$)', 'gi'),
        fromLastWord: false,
        to: '$1St$2',
        inverse: false
    }, {
        from: new RegExp('(' + WORD_BOUNDARY + '|^)St(' + WORD_BOUNDARY + '|$)', 'gi'),
        fromLastWord: false,
        to: '$1Street$2',
        inverse: true
    }];

    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.end();
});

test('createReplacer: substring complex token replacement + diacritics', (t) => {
    const replacer = token.createComplexReplacer({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });
    const expected = [
        { from: /ä/gi, fromLastWord: false, to: 'ae', inverse: false },
        { from: /ö/gi, fromLastWord: false, to: 'oe', inverse: false },
        { from: /ü/gi, fromLastWord: false, to: 'ue', inverse: false },
        { from: /ae/gi, fromLastWord: false, to: 'ä', inverse: true },
        { from: /oe/gi, fromLastWord: false, to: 'ö', inverse: true },
        { from: /ue/gi, fromLastWord: false, to: 'ü', inverse: true }
    ];
    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.end();
});

test('createReplacer: subword complex token replacement', (t) => {
    const replacer = token.createComplexReplacer({
        '([a-z]+)gatan': '$1g'
    });
    const expected = [{
        from: new RegExp('(' + WORD_BOUNDARY + '|^)([a-z]+)gatan(' + WORD_BOUNDARY + '|$)', 'gi'),
        fromLastWord: false,
        to: '$1$2g$3',
        inverse: false
    }];
    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }

    t.deepEqual(replacer, expected, 'created a regex');
    t.deepEqual(token.replaceToken(replacer, 'Mäster Samuelsgatan'), { query: 'Mäster Samuelsg', lastWord: false }, 'Mäster Samuelsgatan => Mäster Samuelsg');
    t.end();
});

test('createReplacer: subword complex token replacement + diacritics', (t) => {
    const replacer = token.createComplexReplacer({
        '([a-z]+)vägen': {
            'text': '$1v'
        }
    });
    const expected = [{
        from: new RegExp('(' + WORD_BOUNDARY + '|^)([a-z]+)vägen(' + WORD_BOUNDARY + '|$)', 'gi'),
        fromLastWord: false,
        to: '$1$2v$3',
        inverse: false
    }, {
        from: new RegExp('(' + WORD_BOUNDARY + '|^)([a-z]+)vagen(' + WORD_BOUNDARY + '|$)', 'gi'),
        fromLastWord: false,
        to: '$1$2v$3',
        inverse: false
    }];

    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.deepEqual(token.replaceToken(replacer, 'Samuelsvägen'), { query: 'Samuelsv', lastWord: false }, 'Samuelsvägen => Samuelsv');
    t.deepEqual(token.replaceToken(replacer, 'Samuelsvagen'), { query: 'Samuelsv', lastWord: false }, 'Samuelsvagen => Samuelsv');
    t.end();
});
