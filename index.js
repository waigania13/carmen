var _ = require('underscore'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter;

var Cache = require('./lib/util/cxxcache'),
    getSearch = require('./lib/search'),
    getContext = require('./lib/context'),
    autoSync = require('./lib/autosync'),
    geocode = require('./lib/geocode'),
    store = require('./lib/store'),
    index = require('./lib/index');

require('util').inherits(Carmen, EventEmitter);
module.exports = Carmen;

// Initialize and load Carmen, with a selection of indexes.
function Carmen(options) {
    if (!options) throw new Error('Carmen options required.');

    var remaining = pairs(options).length;
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

        function opened(err) {
            if (err) return done(err);
            source.getInfo(loadedinfo);
        }

        function loadedinfo(err, info) {
            if (err) return done(err);
            source._geocoder = source._geocoder || new Cache(key, +info.shardlevel || 0);
            source._geocoder.zoom = info.maxzoom;
            source._geocoder.name = key;
            source._geocoder.idx = Object.keys(options).indexOf(key);
            return done();
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
            getContext(this, lon, lat, maxtype, callback);
        }.bind(this));
    }

    return getContext(this, lon, lat, maxtype, callback);
};

// Retrieve the context for a feature (document).
Carmen.prototype._contextByFeature = function(data, callback) {
    if (!('lon' in data)) return callback(new Error('No lon field in data'));
    if (!('lat' in data)) return callback(new Error('No lat field in data'));
    getContext(this, data.lon, data.lat, data.id.split('.')[0], function(err, context) {
        if (err) return callback(err);

        // Push feature onto the top level.
        context.unshift(data);
        return callback(null, context);
    });
};

// Search a carmen source for features matching query.
Carmen.prototype.search = function(source, query, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            getSearch(source, query, callback);
        }.bind(this));
    }
    return getSearch(source, query, callback);
};


// Add docs to a source's index.
Carmen.prototype.index = function(source, docs, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            index(source, docs, callback);
        }.bind(this));
    }
    return index(source, docs, callback);
};

// Serialize and make permanent the index currently in memory for a source.
Carmen.prototype.store = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            store(source, callback);
        }.bind(this));
    }
    return store(source, callback);
};

Carmen.autoSync = autoSync(Carmen);
