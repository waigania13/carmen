'use strict';
const EventEmitter = require('events').EventEmitter;
const inherits = require('util').inherits;

module.exports = MemSource;

inherits(MemSource, EventEmitter);

/**
 * An in-memory tilelive source/sink. Used primarily for testing purposes when instantiating a geocoder. Satisfies API constraints documented {@link https://github.com/mapbox/tilelive/blob/master/API.md here}. If there are three arguments:
 *
 * @access public
 *
 * @param {Array} docs - an array of GeoJSON features to be indexed, or an object with index metadata
 * @param {object} info - an object with index metadata, or a callback function
 * @param {function} callback - a callback function
 */
/**
 * (See above). If there are two arguments:
 *
 * @access public
 *
 * @param {object} docs - an object with index metadata (gets re-assigned to `info`)
 * @param {function} info - a callback function (gets re-assigned to `callback`)
 * @param {undefined} callback - undefined
 */
function MemSource(docs, info, callback) {
    if (typeof info === 'function') {
        callback = info;
        info = docs;
        docs = null;
    }

    this._shards = {};
    this._grids = {};
    this._info = info || { maxzoom: 6, timeout: 0 };
    this._info.geocoder_version = this._info.geocoder_version !== undefined ? this._info.geocoder_version : 9;
    this.open = true;
    this.docs = docs;
    this.logs = {
        getGeocoderData: [],
        putGeocoderData: [],
        getTile: [],
        putTile: []
    };
    return callback(null, this);
}

// Implements carmen#getGeocoderData method.
MemSource.prototype.getGeocoderData = function(type, shard, callback) {
    this.logs.getGeocoderData.push(type + ',' + shard);
    if (this._info.timeout) {
        setTimeout(() => { callback(null, this._shards[type] && this._shards[type][shard]); }, this._info.timeout);
    } else {
        callback(null, this._shards[type] && this._shards[type][shard]);
    }
};

// Implements carmen#putGeocoderData method.
MemSource.prototype.putGeocoderData = function(type, shard, data, callback) {
    this.logs.putGeocoderData.push(type + ',' + shard + ',' + data.length);
    if (this._shards[type] === undefined) this._shards[type] = {};
    this._shards[type][shard] = data;
    if (this._info.timeout) {
        setTimeout(() => { callback(null); }, 10);
    } else {
        callback(null);
    }
};

// Implements carmen#getGeocoderData method.
MemSource.prototype.geocoderDataIterator = function(type) {
    const shards = this._shards[type] || {};
    let shardKeys = Object.keys(shards).map((k) => { return parseInt(k, 10); });
    shardKeys = shardKeys.sort((a, b) => { return a - b; });

    let idx = 0;
    return { asyncNext: function(callback) {
        let out;
        if (idx >= shardKeys.length) {
            out = { value: undefined, done: true };
        } else {
            out = { value: { shard: shardKeys[idx], data: shards[shardKeys[idx]] }, done: false };
            idx++;
        }
        setImmediate(() => {
            callback(null, out);
        });
    } };
};

// Implements carmen#getIndexableDocs method.
MemSource.prototype.getIndexableDocs = function(pointer, callback) {
    pointer = pointer || {};
    if (pointer.done) return callback(null, [], pointer);
    return callback(null, this.docs, { done:true });
};

// Adds carmen schema to startWriting.
MemSource.prototype.startWriting = function(callback) {
    return callback(null);
};

// Shards are stored as binary buffers, so we need to convert them to base64
// strings in order for them to be safe for JSON.stringify
MemSource.prototype.serialize = function() {
    function shardify(shards) {
        const o = {};
        for (const i in shards) {
            o[i] = strings(shards[i]);
        }
        return o;
    }

    function strings(shards) {
        const o = {};
        for (const i in shards) {
            o[i] = shards[i].toString('base64');
        }
        return o;
    }

    return {
        shards: shardify(this._shards),
        geocoder: this._gridstore
    };
};

MemSource.prototype.stopWriting = function(callback) {
    return callback(null);
};

MemSource.prototype.getInfo = function(callback) {
    callback(null, this._info);
};

MemSource.prototype.getTile = function(z,x,y,callback) {
    this.logs.getTile.push(z + ',' + x + ',' + y);
    const key = z + '/' + x + '/' + y;
    if (this._grids[key]) return callback(null, this._grids[key]);
    return callback(new Error('Tile does not exist'));
};

MemSource.prototype.putTile = function(z,x,y,grid,callback) {
    this.logs.putTile.push(z + ',' + x + ',' + y);
    const key = z + '/' + x + '/' + y;
    this._grids[key] = grid;
    return callback && callback();
};
