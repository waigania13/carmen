var _ = require('underscore');
var MBTiles = require('mbtiles');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');
var crypto = require('crypto');
var intstore = require('./intstore');

module.exports = MBTiles;

MBTiles.prototype._carmen = {
    term: {},
    grid: {}
};

// Implements carmen#search method.
MBTiles.prototype.search = function(query, id, callback) {
    var shard = 0; // @TODO make configurable.

    // Load shard. @TODO this will potentially be a shard per term.
    // Probably needs to be abstracted!
    if (!this._carmen.term[shard]) return this._db.get('SELECT data FROM carmen_term WHERE shard = ?', shard, function(err, row) {
        if (err) return callback(err);
        this._carmen.term[shard] = row ? intstore.unserialize(row.data) : {};
        return this.search(query, id, callback);
    }.bind(this));

    // Load shard. @TODO this will potentially be a shard per id.
    // Probably needs to be abstracted!
    if (!this._carmen.grid[shard]) return this._db.get('SELECT data FROM carmen_grid WHERE shard = ?', shard, function(err, row) {
        if (err) return callback(err);
        this._carmen.grid[shard] = row ? intstore.unserialize(row.data) : {};
        return this.search(query, id, callback);
    }.bind(this));

    var ids = [];
    var terms = intstore.terms(query);
    for (var a = 0; a < terms.length; a++) {
        ids = ids.concat(this._carmen.term[shard][terms[a]]);
    }
    ids = intstore.mostfreq(ids);

    var rows = [];
    for (var a = 0; a < ids.length; a++) {
        rows.push({
            id: ids[a],
            zxy: this._carmen.grid[shard][ids[a]]
        });
    }
    callback(null, rows);
};

// Implements carmen#feature method.
MBTiles.prototype.feature = function(id, callback) {
    this._db.get('SELECT key_name AS id, key_json AS data FROM keymap WHERE key_name = ?', id, function(err, row) {
        if (err) return callback(err);
        try { return callback(null, JSON.parse(row.data)); }
        catch(err) { return callback(err); }
    });
};

// Implements carmen#index method.
MBTiles.prototype.index = function(docs, callback) {
    var shard = 0; // @TODO make configurable.
    var remaining = docs.length + 2;
    var done = function(err) {
        if (err) {
            remaining = -1;
            callback(err);
        } else if (!--remaining) {
            callback(null);
        }
    };
    var term;
    var grid;
    this._db.get('SELECT data FROM carmen_term WHERE shard = ?', shard, function(err, row) {
        if (err) return callback(err);
        term = row ? intstore.unserialize(row.data) : {};
        this._db.get('SELECT data FROM carmen_grid WHERE shard = ?', shard, function(err, row) {
            if (err) return callback(err);
            grid = row ? intstore.unserialize(row.data) : {};

            // @TODO invalidate stale terms, grid items based on docs.
            docs.forEach(function(doc) {
                var id = doc.id|0;
                intstore.terms(doc.text).reduce(function(memo, key) {
                    memo[key] = memo[key] || [];
                    memo[key].push(id);
                    return memo;
                }, term);
                grid[id] = doc.zxy.map(intstore.zxy);
                this._db.run('REPLACE INTO keymap (key_name, key_json) VALUES (?, ?)', doc.id, JSON.stringify(doc.doc), done);
            }.bind(this));
            var termBuffer = intstore.serialize(term);
            var gridBuffer = intstore.serialize(grid);
            this._db.run('REPLACE INTO carmen_term (shard, data) VALUES (?, ?)', shard, termBuffer, done);
            this._db.run('REPLACE INTO carmen_grid (shard, data) VALUES (?, ?)', shard, gridBuffer, done);
        }.bind(this));
    }.bind(this));
};

// Implements carmen#indexable method.
MBTiles.prototype.indexable = function(pointer, callback) {
    pointer = pointer || {};
    pointer.limit = pointer.limit || 10000;
    pointer.offset = pointer.offset || 0;

    // If 'carmen' option is passed in initial pointer, retrieve indexables from
    // carmen table. This option can be used to access the previously indexed
    // documents from an MBTiles database without having to know what search
    // field was used in the past (see comment below).
    if (pointer.table === 'carmen') return this._db.all("SELECT c.id, c.text, c.zxy, k.key_json FROM carmen c JOIN keymap k ON c.id = k.key_name LIMIT ? OFFSET ?", pointer.limit, pointer.offset, function(err, rows) {
        if (err) return callback(err);
        var docs = rows.map(function(row) {
            var doc = {};
            doc.id = row.id;
            doc.doc = JSON.parse(row.key_json);
            doc.text = row.text;
            doc.zxy = row.zxy.split(',');
            return doc;
        });
        pointer.offset += pointer.limit;
        return callback(null, docs, pointer);
    }.bind(this));

    // By default the keymap table contains all indexable documents.
    this.getInfo(function(err, info) {
        this._db.all("SELECT k.key_name, k.key_json, GROUP_CONCAT(zoom_level||'/'||tile_column ||'/'||tile_row,',') AS zxy FROM keymap k JOIN grid_key g ON k.key_name = g.key_name JOIN map m ON g.grid_id = m.grid_id WHERE m.zoom_level=? GROUP BY k.key_name LIMIT ? OFFSET ?;", info.maxzoom, pointer.limit, pointer.offset, function(err, rows) {
            if (err) return callback(err);
            var docs = rows.map(function(row) {
                var doc = {};
                doc.id = row.key_name;
                doc.doc = JSON.parse(row.key_json);
                // @TODO the doc field name for searching probably (?) belongs
                // in `metadata` and should be un-hardcoded in the future.
                doc.text = doc.doc.search || '';
                doc.zxy = row.zxy.split(',');
                return doc;
            });
            pointer.offset += pointer.limit;
            return callback(null, docs, pointer);
        }.bind(this));
    }.bind(this));
};

// Adds carmen schema to startWriting.
MBTiles.prototype.startWriting = _(MBTiles.prototype.startWriting).wrap(function(parent, callback) {
    parent.call(this, function(err) {
        if (err) return callback(err);
        var sql = '\
        CREATE INDEX IF NOT EXISTS map_grid_id ON map (grid_id);\
        CREATE TABLE IF NOT EXISTS carmen_term(shard INTEGER PRIMARY KEY, data BLOB);\
        CREATE TABLE IF NOT EXISTS carmen_grid(shard INTEGER PRIMARY KEY, data BLOB);';
        this._db.exec(sql, function(err) {
            if (err) {
                return callback(err);
            } else {
                return callback();
            }
        });
    }.bind(this));
});

