var lockingCache = {},
    ops = require('./util/ops'),
    sm = new (require('sphericalmercator'))(),
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
// @param {Object} carmen: carmen instance
// @param {Float} lon: input longitude
// @param {Float} lat: input latitude
// @param {String} maxtype: optional type of the most detailed feature to return
// @param {Function} callback
module.exports = function(carmen, lon, lat, maxtype, callback) {
    var context = [];
    var indexes = carmen.indexes;
    var types = Object.keys(indexes);
    types = types.slice(0, maxtype ? types.indexOf(maxtype) : types.length);
    var remaining = types.length;

    // No-op context.
    if (!remaining) return callback(null, context);

    // For each context type, load a representative tile, look around the
    // pixel we've identified, and if we find a feature, add it to the `context`
    // array under an array index that represents the position of the context
    // in imaginary z-space (country, town, place, etc). When there are no more
    // to do, return that array, filtered of nulls and reversed.
    types.forEach(loadType);

    function loadType(type, pos) {
        var source = indexes[type],
            zoom = source._geocoder.zoom,
            // Find the potential tile in which a match would occur, and look
            // it up in the cache.
            xyz = sm.xyz([lon,lat,lon,lat], zoom),
            ckey = (zoom * 1e14) + (xyz.minX * 1e7) + xyz.minY;

        lockingCache[source.id] = lockingCache[source.id] || {};
        var cache = lockingCache[source.id];

        if (cache[ckey] && cache[ckey].open) {
            done(null, cache[ckey].data);
        } else if (cache[ckey]) {
            cache[ckey].once('open', done);
        } else {
            cache[ckey] = new Locking();
            source.getGrid(zoom, xyz.minX, xyz.minY, cache[ckey].loader(done));
        }

        function done(err, grid) {
            if (err && err.message !== 'Grid does not exist') {
                remaining = 0;
                return callback(err);
            }
            if (grid) {
                // assume that UTFGrid standard resolution is used
                var resolution = 4,
                    // calculate the pixel within the tile that we're looking for,
                    // as an index into UTFGrid data.
                    px = sm.px([lon,lat], zoom),
                    y = Math.round((px[1] % 256) / resolution),
                    x = Math.round((px[0] % 256) / resolution);

                // Be careful not to look into undefined dimensions of the grid
                x = x > 63 ? 63 : x;
                y = y > 63 ? 63 : y;

                var key, sx, sy;
                // Check both the pixel itself and the 8 surrounding directions
                for (var i = 0; i < scanDirections.length; i++) {
                    sx = x + scanDirections[i][0];
                    sy = y + scanDirections[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[ops.resolveCode(grid.grid[sy].charCodeAt(sx))];
                    if (key) {
                        context[pos] = ops.feature(key, type, grid.data[key]);
                        break;
                    }
                }
            }
            if (!--remaining) {
                context.reverse();
                // remove any falsy values
                return callback(null, context.filter(identity));
            }
        }
    }
};

function identity(v) { return v; }
