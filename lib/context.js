var lockingCache = {},
    zlib = require('zlib'),
    mapnik = require('mapnik'),
    ops = require('./util/ops'),
    sm = new (require('sphericalmercator'))(),
    queue = require('queue-async'),
    Locking = require('./util/locking');

// Not only do we scan the exact point matched by a latitude, longitude
// pair, we also hit the 8 points that surround it as a rectangle.
var scanDirections = [
    [-1,1], [-1,0], [-1,-1],
    [0,-1], [0, 0], [0, 1],
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
// @param {Function} callback
module.exports = function(geocoder, lon, lat, maxtype, callback) {
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
        callback(err, res && res.reverse().filter(identity));
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
                    for (var i = 0; i < results.length; i++) results[i] = results[i].attributes();
                    results.sort(function(a, b) {
                        var ad = Math.sqrt(Math.pow(Math.abs(lon-a.lon),2) + Math.pow(Math.abs(lat-a.lat),2));
                        var bd = Math.sqrt(Math.pow(Math.abs(lon-b.lon),2) + Math.pow(Math.abs(lat-b.lat),2));
                        return ad < bd ? -1 : ad > bd ? 1 : 0;
                    });
                    var res = results[0];
                    // Massage vector tile data into usable context data.
                    if ((res._id||res.id) && (res._text||res.name) && 'lon' in res && 'lat' in res) {
                        res._extid = type + '.' + (res._id||res.id);
                        res._text = res._text || res.name;
                        callback(null, res);
                    } else {
                        callback(null, false);
                    }
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
                    if (res && (res._text||res.name||res.search) && 'lon' in res && 'lat' in res) {
                        res._extid = type + '.' + (res._id||key);
                        res._text = res._text || res.name || res.search;
                        return callback(null, res);
                    }
                }
            }
            return callback(null, false);
        }
    }
};

function identity(v) { return v; }
