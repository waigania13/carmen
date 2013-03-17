var _ = require('underscore');
var MBTiles = require('mbtiles');

module.exports = MBTiles;

// Implements carmen#search method.
MBTiles.prototype.search = function(query, id, callback) {
    var arg = query ? query : id;
    var sql = query
        ? 'SELECT c.id, c.text, c.zxy FROM carmen c WHERE c.text MATCH(?) LIMIT 1000'
        : 'SELECT c.id, c.text, c.zxy FROM carmen c WHERE c.id MATCH(?) LIMIT 1000';
    this._db.all(sql, arg, function(err, rows) {
        if (err) return callback(err);
        rows = rows.map(function(row) {
            row.zxy = row.zxy.split(',');
            return row;
        });
        callback(null, rows);
    });
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
MBTiles.prototype.index = function(id, text, doc, zxy, callback) {
    var remaining = 2;
    var done = function(err) {
        if (err) {
            remaining = -1;
            callback(err);
        } else if (!--remaining) {
            callback(null);
        }
    };
    this._db.run('REPLACE INTO carmen (id, text, zxy) VALUES (?, ?, ?)', id, text, zxy.join(','), done);
    this._db.run('REPLACE INTO keymap (key_name, key_json) VALUES (?, ?)', id, JSON.stringify(doc), done);
};

// Adds carmen schema to startWriting.
MBTiles.prototype.startWriting = _(MBTiles.prototype.startWriting).wrap(function(parent, callback) {
    parent.call(this, function(err) {
        if (err) return callback(err);
        var sql = '\
        CREATE INDEX IF NOT EXISTS map_grid_id ON map (grid_id);\
        CREATE VIRTUAL TABLE carmen USING fts4(id,text,zxy,tokenize=simple);'
        this._db.exec(sql, callback);
    }.bind(this));
});

