var tape = require('tape');
var removeDiacritics = require('../lib/util/remove-diacritics');

tape('removeDiacritics', function(assert) {
    assert.equal(removeDiacritics("Hérê àrë søme wöřdš, including diacritics and puncatuation!"), "Here are some words, including diacritics and puncatuation!", "diacritics are removed from latin text");
    assert.equal(removeDiacritics("Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)"), "Cranberries are low, creeping shrubs or vines up to 2 metres (7 ft)", "nothing happens to latin text with no diacritic marks");
    assert.equal(removeDiacritics("堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》"), "堪《たま》らん！」と片息《かたいき》になつて、喚《わめ》", "nothing happens to Japanese text");
    assert.equal(removeDiacritics("किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने"), "किसी वर्ण के मूल चिह्न के ऊपर, नीचे, अलग-बगल लगने", "nothing happens to Hindi text");
    assert.equal(removeDiacritics("άΆέΈήΉίΊόΌύΎ αΑεΕηΗιΙοΟυΥ"), "αΑεΕηΗιΙοΟυΥ αΑεΕηΗιΙοΟυΥ", "greek diacritics are removed and other characters stay the same");
    assert.equal(removeDiacritics("ўЎёЁѐЀґҐйЙ уУеЕеЕгГиИ"), "уУеЕеЕгГиИ уУеЕеЕгГиИ", "cyrillic diacritics are removed and other characters stay the same");

    assert.end();
});