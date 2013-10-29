var _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    sm = new (require('sphericalmercator'))(),
    crypto = require('crypto'),
    iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE'),
    EventEmitter = require('events').EventEmitter;

var Cache = require('./lib/cxxcache'),
    usagerelev = require('./lib/usagerelev'),
    relev = require('./lib/relevsort'),
    fnv = require('./lib/fnv'),
    read = require('./lib/read'),
    autoSync = require('./lib/autosync'),
    geocode = require('./lib/geocode'),
    Locking = require('./lib/locking'),
    termops = require('./lib/termops'),
    write = require('./lib/write'),
    ops = require('./lib/ops');

var defer = typeof setImmediate === 'undefined' ? process.nextTick : setImmediate,
    lockingCache = {},
    DEBUG = process.env.DEBUG;

// Not only do we scan the exact point matched by a latitude, longitude
// pair, we also hit the 8 points that surround it as a rectangle.
var scanDirections = [
    [-1,1], [-1,0], [-1,-1],
    [0,-1], [0, 0], [0, 1],
    [1,-1], [1, 0], [1, 1]
];

require('util').inherits(Carmen, EventEmitter);
module.exports = Carmen;

// Initialize and load Carmen, with a selection of indexes.
function Carmen(options) {
    if (!options) throw new Error('Carmen options required.');

    var remaining = Object.keys(options).length;
    var done = function(err) {
        if (!--remaining || err) {
            remaining = -1;
            this._error = err;
            this._opened = true;
            this.emit('open', err);
        }
    }.bind(this);

    this.indexes = pairs(options).reduce(loadIndex, {});

    function loadIndex(memo, sourcekey) {
        var source = sourcekey[1],
            key = sourcekey[0];
        // Legacy support.
        source = source.source ? source.source : source;

        memo[key] = source;
        if (source.open) {
            source.getInfo(loadedinfo);
        } else {
            source.once('open', opened);
        }
        return memo;

        function loadedinfo(err, info) {
            if (err) return done(err);
            source._carmen = source._carmen || new Cache(key, info.shardlevel || 0);
            source._carmen.zoom = info.maxzoom;
            source._carmen.name = key;
            source._carmen.idx = Object.keys(options).indexOf(key);
            return done();
        }

        function opened(err) {
            if (err) return done(err);
            source.getInfo(function(err, info) {
                if (err) return done(err);
                source._carmen = source._carmen || new Cache(key, +info.shardlevel || 0);
                source._carmen.zoom = info.maxzoom;
                source._carmen.name = key;
                source._carmen.idx = Object.keys(options).indexOf(key);
                return done();
            });
        }
    }
}

function pairs(o) {
    var a = [];
    for (var k in o) a.push([k, o[k]]);
    return a;
}

Carmen.S3 = function() { return require('./api-s3'); };
Carmen.MBTiles = function() { return require('./api-mbtiles'); };

// Ensure that all carmen sources are opened.
Carmen.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

// Main geocoding API entry point.
// Returns results across all indexes for a given query.
//
// Actual searches are delegated to `Carmen.prototype.search` over each
// enabled backend.
//
// `query` is a string of text, like "Chester, NJ"
// `callback` is called with (error, results)
Carmen.prototype.geocode = function(query, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            geocode(this, query, callback);
        }.bind(this));
    }
    return geocode(this, query, callback);
};

// Returns a hierarchy of features ("context") for a given lon, lat pair.
//
// This is used for reverse geocoding: given a point, it returns possible
// regions that contain it.
Carmen.prototype.context = function(lon, lat, maxtype, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            read.context(this, lon, lat, maxtype, callback);
        }.bind(this));
    }

    return read.context(this, lon, lat, maxtype, callback);
};

// Retrieve the context for a feature (document).
Carmen.prototype.contextByFeature = function(data, callback) {
    if (!('lon' in data)) return callback(new Error('No lon field in data'));
    if (!('lat' in data)) return callback(new Error('No lat field in data'));
    this.context(data.lon, data.lat, data.id.split('.')[0], function(err, context) {
        if (err) return callback(err);

        // Push feature onto the top level.
        context.unshift(data);
        return callback(null, context);
    });
};

// Search a carmen source for features matching query.
Carmen.prototype.search = function(source, query, id, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            read.search(source, query, id, callback);
        }.bind(this));
    }
    return read.search(source, query, id, callback);
};


// Add docs to a source's index.
Carmen.prototype.index = function(source, docs, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            write.index(source, docs, callback);
        }.bind(this));
    }
    return write.index(source, docs, callback);
};

// Serialize and make permanent the index currently in memory for a source.
Carmen.prototype.store = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.store(source, callback);
        }.bind(this));
    }
    return write.store(source, callback);
};

Carmen.autoSync = autoSync(Carmen);
