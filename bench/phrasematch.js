var queue = require('queue-async');
var Carmen = require('..');
var index = require('../lib/index');
var phrasematch = require('../lib/phrasematch');
var mem = require('../lib/api-mem');
var tape = require('tape');

(function() {
    var conf = { street: new mem({ maxzoom:14, geocoder_shardlevel:2 }, function() {}) };
    var c = new Carmen(conf);

    tape('setup', function(assert) {
        var start = +new Date;
        // streetnames with "Lake" from TIGER
        var seq = 1;
        var docs = require('fs').readFileSync(__dirname + '/fixtures/lake-streetnames.txt', 'utf8')
            .split('\n')
            .filter(function(text) { return !!text; })
            .slice(0,10000)
            .reduce(function(memo, text) {
                // generate between 1-100 features with this text.
                var seed = Math.ceil(Math.random() * 100);
                for (var i = 0; i < seed; i++) {
                    var lat = Math.random() * 180 - 90;
                    var lon = Math.random() * 360 - 180;
                    memo.push({
                        _id: ++seq,
                        _text: text,
                        _center: [lon, lat],
                        _geometry: { type:'Point', coordinates:[lon,lat] }
                    });
                }
                return memo;
            }, []);
        index.update(conf.street, docs, 14, function(err) {
            if (err) throw err;
            assert.ok(true, 'setup time ' + (+new Date - start) + 'ms');
            assert.end();
        });
    });
    tape('phrasematch', function(assert) {
        var runs = 10000;
        console.time('phrasematch x'+runs);
        var q = queue(10);
        for (var i = 0; i < runs; i++) q.defer(doit);
        function doit(done) {
            phrasematch(conf.street, 0, 'Lake View Rd', function(err, features, result) {
                if (!result.length) {
                    done(new Error('No results'));
                } else {
                    done();
                }
            });
        }
        q.awaitAll(function(err) {
            console.timeEnd('phrasematch x'+runs);
            assert.ifError(err);
            assert.end();
            process.exit();
        });
    });
})();

