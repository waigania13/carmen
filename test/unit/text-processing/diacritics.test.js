'use strict';
const tape = require('tape');
const removeDiacritics = require('../../../lib/text-processing/remove-diacritics');

tape('removeDiacritics', (t) => {
    // precomosed diacritics
    t.equal(removeDiacritics('Hérê àrë søme wöřdš, including diacritics and puncatuation!'), 'Here are some words, including diacritics and puncatuation!', 'diacritics are removed from latin text');
    t.equal(removeDiacritics('Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)'), 'Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)', 'nothing happens to latin text with no diacritic marks');
    t.equal(removeDiacritics('堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》'), '堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》', 'nothing happens to Japanese text');
    t.equal(removeDiacritics('किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने'), 'किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने', 'nothing happens to Hindi text');
    t.equal(removeDiacritics('άΆέΈήΉίΊόΌύΎ αΑεΕηΗιΙοΟυΥ'), 'αΑεΕηΗιΙοΟυΥ αΑεΕηΗιΙοΟυΥ', 'greek diacritics are removed and other characters stay the same');
    t.equal(removeDiacritics('ўЎёЁѐЀґҐйЙ уУеЕеЕгГиИ'), 'уУеЕеЕгГиИ уУеЕеЕгГиИ', 'cyrillic diacritics are removed and other characters stay the same');
    t.equal(removeDiacritics('ي,ی ى'), 'ى,ى ى', 'arabic diacritics are removed and other characters stay the same');

    // combining diacritics
    t.equal(removeDiacritics('a\u0300'), 'a', 'diacritic removal from latin letter works');
    t.equal(removeDiacritics('Москва́'), 'Москва', 'diacritic removal from Cyrillic works');
    t.equal(removeDiacritics('asdf Москва́'), 'asdf Москва', 'diacritic removal from Cyrillic with mutliple words works');
    t.equal(removeDiacritics('a\u0300\u0301'), 'a', 'removal of multiple combining diacritics from a single letter works');
    t.equal(removeDiacritics('é\u0311'), 'e', 'removal of a combining diacritic and a precomposed diacritic applied to the same letter works');

    // combining diacritics alone are nonsensical and we won't expect good search results here
    // so we don't really care what the results are here as long as they're of nonzero length
    // (which can have weird tokenization results)
    t.assert(removeDiacritics('\u0300').length > 0, 'bare combining diacritics are left alone');
    t.assert(removeDiacritics('\u0300\u0311').length > 0, 'bare combining diacritics are left alone');
    t.assert(removeDiacritics('asdf \u0300').split(' ').filter((t) => t.length > 0).length === 2, 'tokens consisting of bare combining diacritics are left alone');
    t.assert(removeDiacritics('asdf \u0300\u0311').split(' ').filter((t) => t.length > 0).length === 2, 'tokens consisting of bare combining diacritics are left alone');

    t.end();
});
