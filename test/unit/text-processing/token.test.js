'use strict';
const tokenize = require('../../../lib/text-processing/token.js');
const tape = require('tape');

tape.test('token#street=>st', (t) => {
    const tokens = {
        'Street': 'st'
    };

    const tokenReplacer = tokenize.createReplacer(tokens);
    const expected = [{ named: false, from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, to: '$1st$2', inverse: false }];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'fake street'), { query: 'fake st', lastWord: true }, 'fake street => fake st');
    t.end();
});

tape.test('token#includeUnambiguous', (t) => {
    const tokens = {
        'Street': 'st'
    };

    const tokenReplacer = tokenize.createReplacer(tokens, { includeUnambiguous: true });
    const expected =  [
        {
            from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
            inverse: false,
            named: false,
            to: '$1st$2'
        },
        {
            from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)st([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
            inverse: true,
            named: false,
            to: '$1Street$2'
        }
    ];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.end();
});

tape.test('token#concatenated single token', (t) => {
    const tokens = {
        '([a-z]+)gatan': '$1g'
    };
    const tokenReplacer = tokenize.createReplacer(tokens);
    const expected = [{ from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)gatan([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2g$3' }];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Mäster Samuelsgatan'), { query: 'Mäster Samuelsg', lastWord: true }, 'Mäster Samuelsgatan => Mäster Samuelsg');
    t.end();
});

tape.test('token#concatenated single token - diacritics', (t) => {
    const tokens = {
        '([a-z]+)vägen': {
            'text': '$1v'
        }
    };
    const tokenReplacer = tokenize.createReplacer(tokens);
    const expected = [
        { from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vägen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2v$3' },
        { from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vagen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2v$3' }
    ];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Samuelsvägen'), { query: 'Samuelsv', lastWord: true }, 'Samuelsvägen => Samuelsv');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Samuelsvagen'), { query: 'Samuelsv', lastWord: true }, 'Samuelsvagen => Samuelsv');
    t.end();
});

tape.test('token#test global tokens - talstrasse', (t) => {
    const tokens = {
        '\\b(.+)(strasse|str|straße)\\b': '$1 str'
    };
    t.test('talstrasse', (q) => {
        const tokensRegex = tokenize.createGlobalReplacer(tokens);
        q.deepEquals(tokenize.replaceToken(tokensRegex, 'talstrasse'), { query: 'tal str', lastWord: true }, 'talstrasse => tal str');
        q.end();
    });
    t.test('talstraße', (q) => {
        const tokensRegex = tokenize.createGlobalReplacer(tokens);
        q.deepEquals(tokenize.replaceToken(tokensRegex, 'talstraße'), { query: 'tal str', lastWord: true }, 'talstraße => tal str');
        q.end();
    });
    t.test('talstr', (q) => {
        const tokensRegex = tokenize.createGlobalReplacer(tokens);
        q.deepEquals(tokenize.replaceToken(tokensRegex, 'talstr'), { query: 'tal str', lastWord: true }, 'talstr => tal str');
        q.end();
    });
    t.end();
});
