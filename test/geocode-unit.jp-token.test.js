var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var token = require('../lib/util/token');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    district: new mem(null, function() {}),
    place: new mem(null, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
};
var c = new Carmen(conf);

tape('japan token', function(t) {
    var globals = token.createReplacer({
        "^(?=[\u1100-\u11FF\u2E80-\u2EFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F]+)(.*?)([0-9]+)-([0-9]+)(.*)$": "$1$4$5 $2"
    });
    var tokens = token.createReplacer({ 
        "[１1]丁目": "一丁目",
        "[２2]丁目": "二丁目",
        "[３3]丁目": "三丁目",
        "[４4]丁目": "四丁目",
        "[５5]丁目": "五丁目",
        "[６6]丁目": "六丁目",
        "[７7]丁目": "七丁目",
        "[８8]丁目": "八丁目",
        "[９9]丁目": "九丁目",
        "(１０|10)丁目": "十丁目"
    });
    var cities = [
        ["本城町2丁目26-1 下妻市", "本城町二丁目 下妻市 26"],
        ["乙1673-13 安芸郡 奈半利町", "乙 安芸郡 奈半利町 1673"],
        ["中津川市馬籠4571-1", "中津川市馬籠 4571"],
        ["中津川市馬籠4571", "中津川市馬籠4571"]
    ]
    c.geocode(cities[3][0], null, function(err, res) {
        t.assert(res.query.indexOf('4571') > -1, "numbers aren't split");
    });
    cities.forEach(function(item) {
        city = token.replaceToken(globals, item[0]);
        t.deepEqual(token.replaceToken(tokens, city),item[1]);
    });
    t.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    setTimeout(function() {
        assert.end();
    }, 0);
});
