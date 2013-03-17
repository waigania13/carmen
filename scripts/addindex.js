#!/usr/bin/env node

var fs = require('fs');
var argv = process.argv;
var mbtiles = argv[2];
var field = argv[3] || 'search';
var MBTiles = require('../mbtiles');

if (!mbtiles || !field) {
    console.warn('Usage: addindex.sh MBTILES [SEARCH-FIELD]');
    process.exit(1);
}
if (!fs.existsSync(mbtiles)) {
    console.warn('File %s does not exist.', mbtiles);
    process.exit(1);
}

new MBTiles(mbtiles, function(err, source) {
    if (err) throw err;
    source.getInfo(function(err, info) {
        if (err) throw err;
        source.startWriting(function(err) {
            if (err) throw err;
            source._db.all("SELECT k.key_name, k.key_json, GROUP_CONCAT(zoom_level||'/'||tile_column ||'/'||tile_row,',') AS zxy FROM keymap k JOIN grid_key g ON k.key_name = g.key_name JOIN map m ON g.grid_id = m.grid_id WHERE m.zoom_level=? GROUP BY k.key_name;", info.maxzoom, function(err, rows) {
                if (err) throw err;
                var docs = rows.map(function(row) {
                    var doc = {};
                    doc.id = row.key_name;
                    doc.doc = JSON.parse(row.key_json);
                    doc.text = doc.doc[field];
                    doc.zxy = row.zxy.split(',');
                    return doc;
                });
                var write = function() {
                    if (!docs.length) {
                        source.stopWriting(function(err) {
                            if (err) throw err;
                            console.log('Done.');
                        });
                    } else {
                        var doc = docs.shift();
                        source.index(doc.id, doc.text, doc.doc, doc.zxy, function(err) {
                            if (err) throw err;
                            write();
                        });
                    }
                };
                write();
            });
        });
    });
});

