var fs = require('fs');
var path = require('path');
var Stream = require('stream');
var split = require('split');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var de = require('deep-equal');

var test = require('tape');

test('index - streaming interface', (t) => {
    function getIndex(start, end) {

        var count = 0;
        var inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/docs.jsonl'), { encoding: 'utf8' });
        var transformStream = new Stream.Transform();
        transformStream._transform = (data, encoding, done) => {
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
    outputStream._write = (chunk, encoding, done) => {
        var doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    var memObjectA = new mem([], { maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    var confA = {
        country : memObjectA
    };

    var carmenA = new Carmen(confA);
    var indexA = getIndex(0,100);
    t.test('index docs.json', (q) => {
        carmenA.index(indexA, confA.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });
    t.test('ensure index was successful for index A', (q) => {
        carmenA.geocode("India", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    t.test("can't find Turkmenistan, not in Index A", (q) => {
        carmenA.geocode("Turkmenistan", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features.length, 0, "Can't find Turkmenistan");
            q.end();
        });
    });

    var memObjectB = new mem([], { maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    var confB = {
        country: memObjectB
    };

    var carmenB = new Carmen(confB);
    var indexB = getIndex(100,200);
    t.test('index docs.json', (q) => {
        carmenB.index(indexB, confB.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });
    t.test('ensure index was successful for index B', (q) => {
        carmenB.geocode("Paraguay", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });
    t.test("can't find Nauru, not in index B", (q) => {
        carmenB.geocode("Nauru", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features.length, 0, "can't find Nauru");
            q.end();
        });
    });

    var memObjectD = new mem([], { maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    var confD = {
        country: memObjectD
    };

    var carmenD = new Carmen(confD);
    var indexD = getIndex(0,200);
    t.test('index docs.json', (q) => {
        carmenD.index(indexD, confD.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });

    var memObjectC = new mem([], { maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    var confC = { country: memObjectC };
    var carmenC = new Carmen(confC);

    t.test('merged indexes', (q) => {
        carmenC.merge(memObjectA, memObjectB, memObjectC, {}, (err) => {
            if (err) throw err;
            // the dictcache has been reloaded, so copy it over to the carmen object
            carmenC.indexes.country._dictcache = memObjectC._dictcache;
            q.end();
        });
    });
    t.test('ensure index was successful for index A after merging', (q) => {
        carmenC.geocode("India", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    t.test('ensure index was successful for index B after merging', (q) => {
        carmenC.geocode("Paraguay", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });

    t.test('ensure total indexes in C is greater than A and B', (q) => {
        carmenA.analyze(memObjectA, (err, stats) => {
            var a = stats.total;
            carmenB.analyze(memObjectB, (err, stats) => {
                var b = stats.total;
                carmenC.analyze(memObjectC, (err, stats) => {
                    var c = stats.total;
                    t.ok((c > a && c > b), "ok");
                    q.end();
                });
            });
        });
    });

    t.test('ensure geocode of a term that occurs in both indexes produces the same results', (q) => {
        carmenC.geocode('Republic', {}, function(err, resultC) {
            t.ifError(err, "error");
            carmenD.geocode('Republic', {}, function(err, resultD) {
                t.ifError(err, "error");
                t.ok(de(resultC, resultD), 'geocoding "Republic" produces identical results in merged and complete index');
                q.end();
            });
        });
    });

    t.test('ensure merged index features and original features are identical', (q) => {
        var count = 0;
        for (var i = 1; i <= 200; i++) {
            count += de(memObjectC._shards.feature[i], memObjectD._shards.feature[i], "==") ? 1 : 0;
        }
        var percentage = (count/200)*100;
        t.ok(percentage == 100, "features are identical");
        q.end();
    });

    ["freq", "grid"].forEach(function(type) {
        t.test('ensure merged index ' + type + ' and original ' + type + ' are 98 percent similar', (q) => {
            var stringify = (key) => {
                return key[0] + "-" + (key[1] ? key[1].map(function(k) { return "" + k; }).sort().join("-") : "null");
            }
            var cSet = new Set(carmenC.indexes.country._geocoder[type].list().map(stringify));
            var dSet = new Set(carmenD.indexes.country._geocoder[type].list().map(stringify));
            var intersection = new Set(Array.from(cSet).filter((x) => { return dSet.has(x) }));
            var union = new Set(Array.from(cSet).concat(Array.from(dSet)));
            var percentage = 100 * intersection.size / (union.size);
            t.ok(percentage >= 97, type + ' matches > 97%: ' + percentage);

            q.end();
        });
    });

    t.end();
});
