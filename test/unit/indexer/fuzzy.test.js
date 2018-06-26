'use strict';
const tape = require('tape');
const fuzzy = require('node-fuzzy-phrase');

tape('create', (t) => {
    const dict = new fuzzy.FuzzyPhraseSetBuilder("temp.fuzzy");
    t.ok(dict, "FuzzyPhraseSetBuilder built");
    t.end();
});

tape("fuzzyPhraseSet lookup", (t) => {
    let dict = new fuzzy.FuzzyPhraseSetBuilder("temp.fuzzy");

    dict.insert(["the", "quick", "brown", "fox", "jumped", "over", "the", "lazy", "dog"]);
    dict.finish();

    let set = new fuzzy.FuzzyPhraseSet("temp.fuzzy");
    set.contains(["the", "quick", "dog"]);
    //thought this would throw an error
    set.contains(["not", "in", "set"]);;
    t.end();
})
