var xd = Math.pow(2, 39),
    yd = Math.pow(2, 25),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28);

// Combine the scores for each match across multiple grids and zoom levels,
// returning an object of `zxy` => feature mappings
//
// @param {Array} grids
// @param {Array} feats
// @param {Array} types
// @param {Array} zooms
// @param {Array} indexes
// @returns {Object} mapping
module.exports = function coalesceZooms(grids, feats, types, zooms, indexes) {
    var coalesced = {},
        done = {},
        grid,
        feat,
        i, h, f, a,
        z, x, y,
        zxy, pxy, p, s;

    // Cache zoom levels to iterate over as coalesce occurs.
    var zoomcache = {};
    for (i = 0; i < zooms.length; i++) {
        zoomcache[zooms[i]] = zooms.slice(0,i);
        zoomcache[zooms[i]].reverse();
    }

    // Coalesce relevs into higher zooms, e.g.
    // z5 inherits relev of overlapping tiles at z4.
    // @TODO assumes sources are in zoom ascending order.
    for (h = 0; h < grids.length; h++) {
        grid = grids[h];
        feat = feats[h];
        z = indexes[types[h]]._geocoder.zoom;
        for (i = 0; i < grid.length; i++) {
            f = feat[grid[i] % yd];

            if (!f) continue;
            x = Math.floor(grid[i]/xd);
            y = Math.floor(grid[i]%xd/yd);
            zxy = (z * mp2_28) + (x * mp2_14) + y;

            if (!coalesced[zxy]) {
                coalesced[zxy] = [f];
            } else {
                coalesced[zxy].push(f);
            }

            if (!done[zxy]) for (a = 0; a < zoomcache[z].length; a++) {
                p = zoomcache[z][a];
                s = 1 << (z-p);
                pxy = (p * mp2_28) + (Math.floor(x/s) * mp2_14) + Math.floor(y/s);
                // Set a flag to ensure coalesce occurs only once per zxy.
                if (coalesced[pxy]) {
                    coalesced[zxy].push.apply(coalesced[zxy], coalesced[pxy]);
                    done[zxy] = true;
                    break;
                }
            }
        }
    }

    return coalesced;
};
