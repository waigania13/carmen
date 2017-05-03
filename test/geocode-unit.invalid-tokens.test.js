var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');

(() => {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Street": "St",
                "Arcade": "Arc",
                "Apartments": "Apts",
                "Village Post Office": "Vpo",
            }
        }, () => {})
    };
    tape('test invalid tokens', (t) => {
        t.throws(() => {
            var c = new Carmen(conf);
            t.t(c);
        });
        t.end();
    });
})();
