'use strict';
const tape = require('tape');
const tmpdir = require('os').tmpdir();
const fuzzy = require('@mapbox/node-fuzzy-phrase');

tape('create', (t) => {
    const dict = new fuzzy.FuzzyPhraseSetBuilder(tmpdir);
    t.ok(dict, 'FuzzyPhraseSetBuilder built');
    t.end();
});

tape('fuzzyPhraseSet lookup', (t) => {
    const dict = new fuzzy.FuzzyPhraseSetBuilder(tmpdir);

    dict.insert(['the', 'quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog']);
    dict.finish();

    const set = new fuzzy.FuzzyPhraseSet(tmpdir);
    t.equal(set.contains(['the', 'quick', 'dog']), false);
    // thought this would throw an error
    t.equal(set.contains(['not', 'in', 'set']), false);
    t.end();
});
