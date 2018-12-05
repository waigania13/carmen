'use strict';
const tokenize = require('../../../lib/text-processing/token.js');
const tape = require('tape');

tape.test('token#street=>st', (t) => {
    const tokens = {
        'Street': 'st'
    };

    const tokenReplacer = tokenize.createReplacer(tokens);
    const expected = [{
        named: false,
        from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
        fromLastWord: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]*?$)/gi,
        to: '$1st$2',
        inverse: false
    }];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'fake street'), { query: 'fake st', lastWord: true }, 'fake street => fake st');
    t.end();
});

tape.test('token#includeUnambiguous', (t) => {
    const tokens = {
        'Street': 'st'
    };

    const tokenReplacer = tokenize.createReplacer(tokens, { includeUnambiguous: true });
    const expected =  [{
        named: false,
        from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
        fromLastWord: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]*?$)/gi,
        to: '$1st$2',
        inverse: false
    }, {
        named: false,
        from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)st([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
        fromLastWord: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)st([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]*?$)/gi,
        to: '$1Street$2',
        inverse: true
    }];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.end();
});

tape.test('token#concatenated single token', (t) => {
    const tokens = {
        '([a-z]+)gatan': '$1g'
    };
    const tokenReplacer = tokenize.createReplacer(tokens);
    const expected = [{
        named: false,
        from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)gatan([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
        fromLastWord: false,
        to: '$1$2g$3',
        inverse: false
    }];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Mäster Samuelsgatan'), { query: 'Mäster Samuelsg', lastWord: false }, 'Mäster Samuelsgatan => Mäster Samuelsg');
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
        { named: false, from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vägen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, fromLastWord: false, to: '$1$2v$3', inverse: false },
        { named: false, from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vagen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, fromLastWord: false, to: '$1$2v$3', inverse: false }
    ];

    t.deepEquals(tokenReplacer, expected, 'created a regex');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Samuelsvägen'), { query: 'Samuelsv', lastWord: false }, 'Samuelsvägen => Samuelsv');
    t.deepEquals(tokenize.replaceToken(tokenReplacer, 'Samuelsvagen'), { query: 'Samuelsv', lastWord: false }, 'Samuelsvagen => Samuelsv');
    t.end();
});

tape.test('token#test global tokens - talstrasse', (t) => {
    const tokens = {
        '\\b(.+)(strasse|str|straße)\\b': '$1 str'
    };
    const tokensRegex = tokenize.createGlobalReplacer(tokens);
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstrasse'), { query: 'tal str', lastWord: false }, 'talstrasse => tal str');
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstraße'), { query: 'tal str', lastWord: false }, 'talstraße => tal str');
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstr'), { query: 'tal str', lastWord: false }, 'talstr => tal str');
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstrasse 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstrasse 3-5 => tal str 3-5');
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstraße 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstraße 3-5 => tal str 3-5');
    t.deepEquals(tokenize.replaceToken(tokensRegex, 'talstr 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstr 3-5 => tal str 3-5');
    t.end();
});
