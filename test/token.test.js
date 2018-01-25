const tokenize = require('../lib/util/token.js');
const tape = require('tape');

tape.test('token#street=>st', t => {
    const tokens = {
        'Street': 'st'
    }

    const tokenReplacer = tokenize.createReplacer(tokens)
    const expected = [ { named: false, from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, to: '$1st$2', inverse: false } ];

    t.deepEquals(tokenReplacer, expected, 'created a regex')

    const query = 'fake street';
    const replace = tokenize.replaceToken(tokenReplacer, query);

    t.deepEquals(replace, 'fake st', 'replaced the token')
    t.end();
});

tape.test('token#concatenated single token', t => {
    let tokens = {
        '([a-z]+)gatan': {
            'text': '$1g'
        }
    }
    let tokenReplacer = tokenize.createReplacer(tokens)
    let expected = [ { from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)gatan([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2g$3' } ];

    t.deepEquals(tokenReplacer, expected, 'created a regex')

    const query = 'Mäster Samuelsgatan';

    const replace = tokenize.replaceToken(tokenReplacer, query);

    t.deepEquals(replace, 'Mäster Samuelsg', 'replaced the token')
    t.end();
});

tape.test('token#concatenated single token - diacritics', t => {
    let tokens = {
        '([a-z]+)vägen': {
            'text': '$1v'
        }
    }
    let tokenReplacer = tokenize.createReplacer(tokens)
    let expected = [
        { from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vägen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2v$3' },
        { from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)([a-z]+)vagen([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, inverse: false, named: false, to: '$1$2v$3' }
    ]

    t.deepEquals(tokenReplacer, expected, 'created a regex')

    t.equals(tokenize.replaceToken(tokenReplacer, 'Samuelsvägen'), 'Samuelsv', 'replaced token');
    t.equals(tokenize.replaceToken(tokenReplacer, 'Samuelsvagen'), 'Samuelsv', 'replaced token');
    t.end();
});

tape.test('token#test global tokens - talstrasse', (t) => {
    let tokens = {
        '\\b(.+)(strasse|str|straße)\\b': "$1 str"
    };
    t.test('talstrasse', (q) => {
        let query = 'talstrasse';
        let tokensRegex = tokenize.createGlobalReplacer(tokens)
        let replace = tokenize.replaceToken(tokensRegex, query);
        q.deepEquals(replace, 'tal str', 'talstrasse')
        q.end();
    });
    t.test('talstraße', (q) => {
        let query = 'talstraße';
        let tokensRegex = tokenize.createGlobalReplacer(tokens)
        let replace = tokenize.replaceToken(tokensRegex, query);
        q.deepEquals(replace, 'tal str', 'talstraße')
        q.end();
    });
    t.test('talstr', (q) => {
        let query = 'talstr';
        let tokensRegex = tokenize.createGlobalReplacer(tokens)
        let replace = tokenize.replaceToken(tokensRegex, query);
        q.deepEquals(replace, 'tal str', 'talstr')
        q.end();
    });
    t.end();
});
