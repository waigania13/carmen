#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var api = {
    '.s3': require('../api-s3'),
    '.mbtiles': require('../api-mbtiles')
};
var Carmen = require('../index.js');
var Queue = require('../queue');
var f = argv[2];

if (!f) {
    console.warn('Usage: carmen-analyze.js <file>');
    process.exit(1);
}
if (!fs.existsSync(f)) {
    console.warn('File %s does not exist.', f);
    process.exit(1);
}
if (!api[path.extname(f)]) {
    console.warn('File %s format not recognized.', f);
    process.exit(1);
}

console.log('Analyzing %s ...', f);

var s = new api[path.extname(f)](f, function() {});
var carmen = new Carmen({ s: s });
var stats = {};

carmen._open(function(err) {
    if (err) throw err;
    var shardlevel = s._carmen.shardlevel;
    stats.shardlevel = shardlevel;
    stats.term2phrase = {
        min:Infinity,
        max:0,
        mean:0,
        count:0,
        maxes:[]
    };
    (function term2phrase(i, callback) {
        var rels;
        var stat = stats.term2phrase;

        // If complete or on a 100th run go through maxes.
        if (i >= Math.pow(16, shardlevel) || (i % 100) === 0) {
            stat.maxes.sort(function(a, b) {
                return a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0;
            });
            stat.maxes = stat.maxes.slice(0,10);
        }

        // Done.
        if (i >= Math.pow(16, shardlevel)) return (function finalize(i, callback) {
            if (i >= stat.maxes.length) return callback();
            var term = stat.maxes[i][0];
            var phrase = stat.maxes[i][2];
            var shard = Carmen.shard(shardlevel, phrase);
            Carmen.get(s, 'phrase', shard, function(err, data) {
                if (err) return callback(err);
                if (!data[phrase]) return callback(new Error('Phrase ' + phrase + ' not found'));
                var docid = data[phrase].docs[0];
                var shard = Carmen.shard(shardlevel, docid);
                Carmen.get(s, 'docs', shard, function(err, data) {
                    if (err) return callback(err);
                    if (!data[docid]) return callback(new Error('Doc ' + docid + ' not found'));
                    var text = data[docid].doc.search || data[docid].doc.name || '';
                    var query = Carmen.tokenize(text);
                    var terms = Carmen.terms(text);
                    var idx = terms.indexOf(+term);
                    if (idx !== -1) {
                        stat.maxes[i].unshift(query[idx]);
                    } else {
                        stat.maxes[i].unshift(text);
                    }
                    finalize(++i, callback);
                });
            });
        })(0, callback);

        Carmen.get(s, 'term', i, function(err, data) {
            if (err) return callback(err);
            for (var id in data) {
                rels = data[id].length;
                stat.min = Math.min(stat.min, rels);
                stat.max = Math.max(stat.max, rels);
                stat.mean = ((stat.mean * stat.count) + rels) / (stat.count + 1);
                stat.count++;
                stat.maxes.push([id,rels,data[id][0]]);
            }
            term2phrase(++i, callback);
        });
    })(0, function(err) {
        if (err) throw err;
        console.warn(stats.term2phrase);
    });
});
