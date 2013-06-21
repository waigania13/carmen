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
    var shardlevel = 2;
    var ids = [];
    var zxy = [];
    var terms = intstore.terms(query);
    var source = this;

    var getids = function() {
        if (!terms.length) {
            ids = intstore.mostfreq(ids);
            return getzxy();
        }
        var term = terms.shift();
        var shard = intstore.shard(shardlevel, term);
        source.getCarmen('term', shard, function(err, data) {
            if (err) return callback(err);
            ids = ids.concat(data[term]);
            getids();
        });
    };

    var getzxy = function() {
        if (!ids.length) {
            return callback(null, zxy);
        }
        var id = ids.shift();
        var shard = intstore.shard(shardlevel, id);
        source.getCarmen('grid', shard, function(err, data) {
            if (err) return callback(err);
            zxy.push({ id: id, zxy: data[id] });
            getzxy();
        });
    };

    getids();
};

// Implements carmen#feature method.
MBTiles.prototype.feature = function(id, callback) {
    this._db.get('SELECT key_name AS id, key_json AS data FROM keymap WHERE key_name = ?', id, function(err, row) {
        if (err) return callback(err);
        try { return callback(null, JSON.parse(row.data)); }
        catch(err) { return callback(err); }
    });
};

MBTiles.prototype.getCarmen = function(type, shard, callback) {
    if (this._carmen[type][shard]) return callback(null, this._carmen[type][shard]);

    return this._db.get('SELECT data FROM carmen_' + type + ' WHERE shard = ?', shard, function(err, row) {
        if (err) return callback(err);
        this._carmen[type][shard] = row ? intstore.unserialize(row.data) : {};
        callback(null, this._carmen[type][shard]);
    }.bind(this));
};

MBTiles.prototype.putCarmen = function(type, shard, data, callback) {
    return this._db.run('REPLACE INTO carmen_' + type + ' (shard, data) VALUES (?, ?)', shard, intstore.serialize(data), function(err) {
        if (err) return callback(err);
        this._carmen[type][shard] = data;
        callback(null);
    }.bind(this));
};

// Implements carmen#index method.
MBTiles.prototype.index = function(docs, callback) {
    var source = this;
    var shardlevel = 2;
    var remaining = docs.length;
    var patch = { term: {}, grid: {} };
    var done = function(err) {
        if (err) {
            remaining = -1;
            callback(err);
        } else if (!--remaining) {
            callback(null);
        }
    };
    docs.forEach(function(doc) {
        var docid = doc.id|0;
        intstore.terms(doc.text).reduce(function(memo, id) {
            var shard = intstore.shard(shardlevel, id);
            memo[shard] = memo[shard] || {};
            memo[shard][id] = memo[shard][id] || [];
            memo[shard][id].push(docid);
            return memo;
        }, patch.term);
        var shard = intstore.shard(shardlevel, docid);
        patch.grid[shard] = patch.grid[shard] || {};
        patch.grid[shard][docid] = doc.zxy.map(intstore.zxy);
    }.bind(this));
    // Number of term shards.
    remaining += Object.keys(patch.term).length;
    // Number of grid shards.
    remaining += Object.keys(patch.grid).length;
    // Add each doc individually to the keymap table.
    // @TODO API method for get/put features.
    docs.forEach(function(doc) {
        source._db.run('REPLACE INTO keymap (key_name, key_json) VALUES (?, ?)', doc.id, JSON.stringify(doc.doc), done);
    });
    _(patch).each(function(shards, type) {
        _(shards).each(function(data, shard) {
            source.getCarmen(type, shard, function(err, current) {
                // This merges new entries on top of old ones.
                // @TODO invalidate old entries (?) can this be done incrementally?
                _(data).each(function(val, key) {
                    current[key] = current[key] || [];
                    current[key] = _(current[key].concat(val)).uniq();
                });
                source.putCarmen(type, shard, current, done);
            });
        });
    });
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

