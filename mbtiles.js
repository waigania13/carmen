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
