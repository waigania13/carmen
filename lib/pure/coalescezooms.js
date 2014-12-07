var uniq = require('../util/uniq');
var xd = Math.pow(2, 39),
    yd = Math.pow(2, 25),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28);

function sortNumeric(a,b) { return a < b ? -1 : 1; }

// Combine the scores for each match across multiple grids and zoom levels,
// returning an object of `zxy` => feature mappings
//
// @param {Array} grids
// @param {Array} feats
// @param {Array} zooms
// @returns {Object} mapping
module.exports = function coalesceZooms(grids, feats, zooms) {
    var coalesced = {},
        done = {},
        grid,
        i, h, f, a,
        z, x, y,
        zxy, pxy, p, s;

    // Filter zooms down to those with matches.
    var matchedZooms = [];
    for (i = 0; i < zooms.length; i++) {
        if (grids[i].length) matchedZooms.push(zooms[i]);
    }
    matchedZooms = uniq(matchedZooms).sort(sortNumeric);

    // Cache zoom levels to iterate over as coalesce occurs.
    var zoomcache = {};
    for (i = 0; i < matchedZooms.length; i++) {
        zoomcache[matchedZooms[i]] = matchedZooms.slice(0,i);
        zoomcache[matchedZooms[i]].reverse();
    }

    // Coalesce relevs into higher zooms, e.g.
    // z5 inherits relev of overlapping tiles at z4.
    // @TODO assumes sources are in zoom ascending order.
    for (h = 0; h < grids.length; h++) {
        grid = grids[h];
        z = zooms[h];
        for (i = 0; i < grid.length; i++) {
            var tmpid = h * 1e8 + (grid[i] % yd);

            x = Math.floor(grid[i]/xd);
            y = Math.floor(grid[i]%xd/yd);
            zxy = (z * mp2_28) + (x * mp2_14) + y;

            if (!coalesced[zxy]) {
                coalesced[zxy] = [tmpid];
                coalesced[zxy].key = tmpid;
            } else {
                coalesced[zxy].push(tmpid);
                coalesced[zxy].key += '-' + tmpid;
            }

            if (!done[zxy]) for (a = 0; a < zoomcache[z].length; a++) {
                p = zoomcache[z][a];
                s = 1 << (z-p);
                pxy = (p * mp2_28) + (Math.floor(x/s) * mp2_14) + Math.floor(y/s);
                // Set a flag to ensure coalesce occurs only once per zxy.
                if (coalesced[pxy]) {
                    coalesced[zxy].push.apply(coalesced[zxy], coalesced[pxy]);
                    coalesced[zxy].key += '-' + coalesced[pxy].key;
                    done[zxy] = true;
                    break;
                }
            }
        }
    }

    return coalesced;
};

