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
            .slice(0,50)
            .reduce(function(memo, text) {
                // generate between 1-100 features with this text.
                var seed = 2000;
                for (var i = 0; i < seed; i++) {
                    var lat = Math.random() * 170 - 85;
                    var lon = Math.random() * 360 - 180;
                    memo.push({
                        id: ++seq,
                        properties: {
                            'carmen:text': text,
                            'carmen:center': [lon, lat]
                        },
                        geometry: { type:'Point', coordinates:[lon,lat] },
                        bbox: []
                    });
                }
                return memo;
            }, []);
        index.update(conf.street, docs, 14, function(err) {
            if (err) throw err;
            index.store(conf.street, function(err) {
                if (err) throw err;
                assert.ok(true, 'setup time ' + (+new Date - start) + 'ms');
                assert.end();
            });
        });
    });
    tape('phrasematch', function(assert) {
        var runs = 10000;
        console.time('phrasematch x'+runs);
        var q = queue(10);
        for (var i = 0; i < runs; i++) q.defer(doit);
        function doit(done) {
            phrasematch(conf.street, 'Westside Lake Rd', function(err, result) {
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

