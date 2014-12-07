var queue = require('queue-async');
var Carmen = require('..');
var index = require('../lib/index');
var phrasematch = require('../lib/phrasematch');
var mem = require('../lib/api-mem');
var tape = require('tape');

(function() {
    var conf = { street: new mem({ maxzoom:14 }, function() {}) };
    var c = new Carmen(conf);

    tape('setup', function(assert) {
        // streetnames with "Lake" from TIGER
        var docs = require('fs').readFileSync(__dirname + '/fixtures/lake-streetnames.txt', 'utf8')
            .split('\n')
            .filter(function(text) { return !!text; })
            .map(function(text, i) {
                var lat = Math.random() * 180 - 90;
                var lon = Math.random() * 360 - 180;
                return {
                    _id: i+1,
                    _text: text,
                    _center: [lon, lat],
                    _geometry: { type:'Point', coordinates:[lon,lat] }
                };
            });
        index.update(conf.street, docs, 14, function(err) {
            if (err) throw err;
            assert.end();
        });
    });
    tape('geocode', function(assert) {
        var runs = 10000;
        console.time('geocode x'+runs);
        var q = queue(10);
        for (var i = 0; i < runs; i++) q.defer(doit);
        function doit(done) {
            c.geocode('Lake View Rd', {}, function (err, res) {
                done();
            });
        }
        q.awaitAll(function(err) {
            console.timeEnd('geocode x'+runs);
            assert.ifError(err);
            assert.end();
            process.exit();
        });
    });
})();

