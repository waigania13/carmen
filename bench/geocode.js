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
            .slice(0,100)
            .reduce(function(memo, text) {
                // generate between 1-100 features with this text.
                var seed = 2000;
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
    tape('geocode', function(assert) {
        var errored = false;
        var runs = 100;
        console.time('geocode x'+runs);
        var q = queue(10);
        for (var i = 0; i < runs; i++) q.defer(doit);
        function doit(done) {
            c.geocode('Westside Lake Rd', {}, function (err, res) {
                if (err || (res && !res.features.length)) {
                    errored = true;
                }
                done();
            });
        }
        q.awaitAll(function(err) {
            console.timeEnd('geocode x'+runs);
            assert.ifError(errored);
            assert.end();
            process.exit();
        });
    });
})();

