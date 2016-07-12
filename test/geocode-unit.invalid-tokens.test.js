var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Village Post Office": "Vpo",
            }
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder invalid token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'fake village post office',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test fake village post office', function(t) {
        c.geocode('fake village post office', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.throws(function(err) {
                if ((err instanceof Error) && /Using global tokens/.test(err)) {
                    return true;
                }
            },
            "Using Global Tokens"
            );
            t.end();
        });
    });
})();
