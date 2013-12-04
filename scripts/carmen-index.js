#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var Queue = require('../queue');
var f = argv[2];
var t = argv[3];

if (!f) {
    console.warn('Usage: carmen-index.js <from> [to]');
    process.exit(1);
}

var nogrids = ('NOGRIDS' in process.env);
if (nogrids) console.log('Indexing without grids.');

console.log('Indexing %s ...', f);

var from = Carmen.auto(f);
var to = t ? Carmen.auto(t) : from;
var carmen = new Carmen({ from: from, to: to });

carmen._open(function(err) {
    if (err) throw err;
    to.startWriting(function(err) {
        if (err) throw err;
        var index = function(pointer) {
            from.getIndexableDocs(pointer, function(err, docs, pointer) {
                if (err) throw err;
                if (!docs.length) {
                    var start = +new Date;
                    console.log('Storing docs...');
                    return carmen.store(to, function(err) {
                        console.log('Stored in %ss', Math.floor((+new Date-start) * 0.001));
                        if (err) throw err;
                        to.stopWriting(function(err) {
                            if (err) throw err;
                            console.log('Done.');
                            process.exit(0);
                        });
                    });
                }
                var start = +new Date;
                carmen.index(to, docs, function(err) {
                    if (err) throw err;
                    console.log('Indexed %s docs @ %s/s', docs.length, Math.floor(docs.length * 1000 / (+new Date - start)));
                    index(pointer);
                });
            });
        };
        index({nogrids:nogrids});
    });
});
