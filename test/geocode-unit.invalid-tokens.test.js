var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Street": "St",
                "Arcade": "Arc",
                "Apartments": "Apts",
                "Village Post Office": "Vpo",
            }
        }, function() {})
    };
    tape('test invalid tokens', (t) => {
        t.throws(function() {
            var c = new Carmen(conf);
            t.t(c);
        });
        t.end();
    });
})();
