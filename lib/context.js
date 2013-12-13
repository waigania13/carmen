var lockingCache = {},
    zlib = require('zlib'),
    mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    ops = require('./util/ops'),
    sm = new (require('sphericalmercator'))(),
    queue = require('queue-async'),
    Locking = require('./util/locking');

// Not only do we scan the exact point matched by a latitude, longitude
// pair, we also hit the 8 points that surround it as a rectangle.
var scanDirections = [
    [0, 0], [0,-1], [0, 1],
    [-1,1], [-1,0], [-1,-1],
    [1,-1], [1, 0], [1, 1]
];

// Returns a hierarchy of features ("context") for a given lon, lat pair.
//
// This is used for reverse geocoding: given a point, it returns possible
// regions that contain it.
//
// @param {Object} geocoder: geocoder instance
// @param {Float} lon: input longitude
// @param {Float} lat: input latitude
// @param {String} maxtype: optional type of the most detailed feature to return
// @param {String} full: boolean of whether to do a full load of all features
// @param {Function} callback
module.exports = function(geocoder, lon, lat, maxtype, full, callback) {
    var context = [];
    var indexes = geocoder.indexes;
    var types = Object.keys(indexes);
    types = types.slice(0, maxtype ? types.indexOf(maxtype) : types.length);

    // No-op context.
    if (!types.length) return callback(null, context);

    var q = queue();
    types.forEach(function(type) {
        q.defer(loadType, type);
    });

    q.awaitAll(function(err, res) {
        if (err) return callback(err);
        res = res.reverse().filter(identity);
        callback(null, res);
    });

    // For each context type, load a representative tile, look around the
    // pixel we've identified, and if we find a feature, add it to the `context`
    // array under an array index that represents the position of the context
    // in imaginary z-space (country, town, place, etc). When there are no more
    // to do, return that array, filtered of nulls and reversed.
    function loadType(type, callback) {
        var source = indexes[type],
            layer = source._geocoder.geocoder_layer,
            done = source._geocoder.format === 'pbf' ? queryVector : queryGrid,
            method = source._geocoder.format === 'pbf' ? 'getTile' : 'getGrid',
            maxzoom = source._geocoder.maxzoom,
            id = source._geocoder.id,
            // Find the potential tile in which a match would occur, and look
            // it up in the cache.
            xyz = sm.xyz([lon, lat, lon, lat], maxzoom),
            ckey = (maxzoom * 1e14) + (xyz.minX * 1e7) + xyz.minY;

        lockingCache[id] = lockingCache[id] || {};
        var cache = lockingCache[id];

        if (cache[ckey] && cache[ckey].open) {
            done(null, cache[ckey].data);
        } else if (cache[ckey]) {
            cache[ckey].once('open', done);
        } else {
            cache[ckey] = new Locking();
            source[method](maxzoom, xyz.minX, xyz.minY, cache[ckey].loader(done));
        }
        function queryVector(err, zpbf) {
            if (err && err.message !== 'Tile does not exist') return callback(err);
            if (!zpbf) return callback(null, false);

            // Uses a 50m (web mercator units) tolerance.
            var opts = { tolerance:50 };
            if (layer) opts.layer = layer;

            zlib.inflate(zpbf, function(err, pbf) {
                if (err) return callback(err);
                var vt = new mapnik.VectorTile(maxzoom, xyz.minX, xyz.minY);
                vt.setData(pbf,function(err) {
                    if (err) throw err;
                    var results = vt.query(lon, lat, opts)||[];
                    if (!results || !results.length) return callback(null, false);
                    var attr = results[0].attributes();
                    attr._id = results[0].id();
                    return loadFeature(attr, callback);
                });
            });
        }
        function queryGrid(err, grid) {
            if (err && err.message !== 'Grid does not exist') {
                return callback(err);
            }
            if (grid) {
                // assume that UTFGrid standard resolution is used
                var resolution = 4,
                    // calculate the pixel within the tile that we're looking for,
                    // as an index into UTFGrid data.
                    px = sm.px([lon,lat], maxzoom),
                    y = Math.floor((px[1] % 256) / resolution),
                    x = Math.floor((px[0] % 256) / resolution);

                var key, sx, sy;
                // Check both the pixel itself and the 8 surrounding directions
                for (var i = 0; i < scanDirections.length; i++) {
                    sx = x + scanDirections[i][0];
                    sy = y + scanDirections[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[ops.resolveCode(grid.grid[sy].charCodeAt(sx))];
                    var res = key && grid.data[key];
                    // Massage grid data into usable context data.
                    if (res) {
                        res._id = res._id || key;
                        return loadFeature(res, callback);
                    }
                }
            }
            return callback(null, false);
        }
        // Load the full feature from geocoding data if needed, otherwise create
        // a light reference with id + text.
        function loadFeature(feat, callback) {
            if (!full) {
                var loaded = {};
                loaded._extid = type + '.' + feat._id;
                loaded._text = feat._text || feat.name || feat.search;
                return callback(null, loaded._text ? loaded : false);
            }
            feature.getFeature(source, termops.feature(feat._id), function(err, data) {
                if (err) return callback(err);
                if (!data || !data[feat._id]) return callback()
                var loaded = data[feat._id];
                loaded._extid = type + '.' + feat._id;
                return callback(null, loaded);
            });
        }
    }
};

function identity(v) { return v; }
