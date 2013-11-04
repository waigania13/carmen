var _ = require('underscore'),
    iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE'),
    crypto = require('crypto'),
    fs = require('fs');

module.exports = FSAPI;
require('util').inherits(FSAPI, Parent);

function FSAPI(uri, callback) {
    return Parent.call(this, uri, function(err, source) {
        source.emit('open', err);
        callback(err, source);
    });
}

// Implements carmen#getFeature method.
FSAPI.prototype.getFeature = function(id, callback) {
    fs.readFile(id, load);
    function load(err, res) {
        try {
            return callback(null, JSON.parse(res));
        } catch(e) {
            return callback(err || e);
        }
    }
};

// Implements carmen#putFeature method.
FSAPI.prototype.putFeature = function(id, data, callback) {
    fs.writeFile(id, data, load);
    function load(err, res) {
        return callback(err);
    }
};

// Implements carmen#getCarmen method.
FSAPI.prototype.getCarmen = function(type, shard, callback) {
    return this._db.get('SELECT data FROM carmen2 WHERE type = ? AND shard = ?', type, shard, function(err, row) {
        callback(err, row ? row.data : null);
    });
};

// Implements carmen#putCarmen method.
FSAPI.prototype.putCarmen = function(type, shard, data, callback) {
    this.write('carmen2', type + '.' + shard, { type:type, shard: shard, data: data }, callback);
};

// Implements carmen#indexable method.
FSAPI.prototype.indexable = function(pointer, callback) {
    pointer = pointer || {};
    pointer.limit = pointer.limit || 10000;
    pointer.offset = pointer.offset || 0;
    pointer.nogrids = 'nogrids' in pointer ? pointer.nogrids : false;

    // Converts MBTiles native TMS coords to ZXY.
    function tms2zxy(zxys) {
        return zxys.split(',').map(function(tms) {
            var zxy = tms.split('/').map(function(v) { return parseInt(v, 10); });
            zxy[2] = (1 << zxy[0]) - 1 - zxy[2];
            return zxy.join('/');
        });
    }

    // If 'carmen' option is passed in initial pointer, retrieve indexables from
    // carmen table. This option can be used to access the previously indexed
    // documents from an MBTiles database without having to know what search
    // field was used in the past (see comment below).
    if (pointer.table === 'carmen') {
        return this._db.all("SELECT c.id, c.text, c.zxy, k.key_json FROM carmen c JOIN keymap k ON c.id = k.key_name LIMIT ? OFFSET ?", pointer.limit, pointer.offset, function(err, rows) {
            if (err) return callback(err);
            var docs = rows.map(function(row) {
                var doc = {};
                doc.id = row.id;
                doc.doc = JSON.parse(row.key_json);
                doc.text = row.text;
                if (row.zxy) doc.zxy = tms2zxy(row.zxy);
                return doc;
            });
            pointer.offset += pointer.limit;
            return callback(null, docs, pointer);
        }.bind(this));
    }

    // By default the keymap table contains all indexable documents.
    this.getInfo(function(err, info) {
        if (err) return callback(err);
        var sql, args;
        if (pointer.nogrids) {
            sql = "SELECT key_name, key_json FROM keymap LIMIT ? OFFSET ?;";
            args = [pointer.limit, pointer.offset];
        } else {
            sql = "SELECT k.key_name, k.key_json, GROUP_CONCAT(zoom_level||'/'||tile_column ||'/'||tile_row,',') AS zxy FROM keymap k JOIN grid_key g ON k.key_name = g.key_name JOIN map m ON g.grid_id = m.grid_id WHERE m.zoom_level=? GROUP BY k.key_name LIMIT ? OFFSET ?;";
            args = [info.maxzoom, pointer.limit, pointer.offset];
        }
        this._db.all(sql, args, function(err, rows) {
            if (err) return callback(err);
            var docs = rows.map(function(row) {
                var doc = {};
                doc.id = row.key_name;
                doc.doc = JSON.parse(row.key_json);
                // @TODO the doc field name for searching probably (?) belongs
                // in `metadata` and should be un-hardcoded in the future.
                doc.text = doc.doc.search || doc.doc.name || '';
                if (row.zxy) doc.zxy = tms2zxy(row.zxy);
                return doc;
            });
            pointer.offset += pointer.limit;
            return callback(null, docs, pointer);
        }.bind(this));
    }.bind(this));
};

// Adds carmen schema to startWriting.
FSAPI.prototype.startWriting = function(callback) {
    return callback(null);
};
