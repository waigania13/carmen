var fs = require('fs');
var path = require('path');
var Stream = require('stream');
var split = require('split');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var de = require('deep-equal');
var queue = require("d3-queue").queue;

var test = require('tape');
var merge = require('../lib/merge');

var randomMBtiles = function() {
    return '/tmp/' + ((new Date()).getTime() + Math.random()).toString().replace(".", "_") + ".mbtiles";
}

test('index - streaming interface', function(t) {
    function getIndex(start, end) {

        var count = 0;
        var inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/docs.jsonl'), { encoding: 'utf8' });
        var transformStream = new Stream.Transform();
        transformStream._transform = function(data, encoding, done) {
            if (data) {
                count ++;
            }
            if (count > start && count <= end) {
                this.push(data+"\n");
            }
            done();
        };
        inputStream.pipe(split()).pipe(transformStream);
        return transformStream;
    }

    var outputStream = new Stream.Writable();
    outputStream._write = function(chunk, encoding, done) {
        var doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    var files = {
        A: randomMBtiles(),
        B1: randomMBtiles(),
        B2: randomMBtiles()
    }
    var carmens = {}, confs = {};
    t.test('open carmens', function(t) {
        var q = queue();
        Object.keys(files).forEach(function(key) {
            q.defer(function(key, callback) {
                merge.getOutputConf(files[key], { maxzoom: 6, geocoder_languages: ['zh'] }, function(_oc) {
                    confs[key] = {country: _oc.to};
                    carmens[key] = new Carmen(confs[key]);
                    callback();
                });
            }, key);
        });
        q.awaitAll(function(err) {
            t.ifError(err);
            t.end();
        })
    });

    var chunks = {
        A: getIndex(0,100),
        B1: getIndex(100,150),
        B2: getIndex(150,200)
    }
    Object.keys(chunks).forEach(function(key) {
        t.test('index docs.json chunk ' + key, function(t) {
            carmens[key].index(chunks[key], confs[key].country, {
                zoom: 6,
                output: outputStream
            }, function(err) {
                t.ifError(err);
                t.end();
            });
        });
    });

    var memObjectD = new mem([], { maxzoom: 6, geocoder_languages: ['zh'] }, function() {});
    confs.D = {
        country: memObjectD
    };

    carmens.D = new Carmen(confs.D);
    t.test('index docs.json in its entirety', function(q) {
        carmens.D.index(getIndex(0,200), confs.D.country, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });

    t.test('multi-way merged indexes', function(q) {
        files.C = randomMBtiles();
        merge.multimerge([files.A, files.B1, files.B2], files.C, { maxzoom: 6, geocoder_languages: ['zh'] }, function(err) {
            if (err) throw err;

            var auto = Carmen.auto(files.C, function() {
                var conf = {
                    country: auto
                };
                confs.C = conf;
                carmens.C = new Carmen(conf);
                q.end();
            });
        });
    });
    t.test('ensure index was successful for index A after merging', function(q) {
        carmens.C.geocode("India", {}, function(err, result) {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    t.test('ensure index was successful for index B1 after merging', function(q) {
        carmens.C.geocode("Paraguay", {}, function(err, result) {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });
    t.test('ensure index was successful for index B2 after merging', function(q) {
        carmens.C.geocode("Palau", {}, function(err, result) {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Palau", "found Palau");
            q.end();
        });
    });

    t.test('ensure geocode of a term that occurs in both indexes produces the same results', function(q) {
        carmens.C.geocode('Republic', {}, function(err, resultC) {
            t.ifError(err, "error");
            carmens.D.geocode('Republic', {}, function(err, resultD) {
                t.ifError(err, "error");
                t.ok(de(resultC, resultD), 'geocoding "Republic" produces identical results in merged and complete index');
                q.end();
            });
        });
    });

    t.test('clean up', function(t) {
        Object.keys(files).forEach(function(key) {
            fs.unlinkSync(files[key]);
        });
        t.end();
    })

    t.end();
});
