'use strict';
// TODO: write unit test for analyze.js
const decode = require('./grid').decode;

/**
 * Generate summary statistics about a source. Used by `scripts/carmen-analyze.js`.
 *
 * Summary stats include:
 *
 * | statistic | type                   | description |
 * |-----------|------------------------|-------------|
 * | `total`   | number                 | the total number of grids |
 * | `byScore` | Object<string, number> | grid counts, grouped by grid score value (from `"1"` to `"6"`) |
 * | `byRelev` | Object<string, number> | grid counts, grouped by grid revelance. group labels reflect the relevance value, rounded to the nearest tenth ("0.4", "0.6", "0.8", "1.0") |
 *
 * @access public
 *
 * @param {CarmenSource} source - a source whose indexing is complete
 * @param {function} callback - a callback function
 * @returns {function(object)} output of `callback(stats)`
 */
module.exports = function analyze(source, callback) {
    const s = source;
    const stats = {
        total: 0,
        byScore: {},
        byRelev: {}
    };
    for (let i = 0; i < 7; i++) stats.byScore[i] = 0;
    for (let j = 0.4; j <= 1; j = j + 0.2) stats.byRelev[j.toFixed(1)] = 0;

    const ids = s._geocoder.grid.list();
    ids.sort();
    while (ids.length) {
        const id = ids.shift();
        const grids = s._geocoder.grid.get(id[0], id[1]);
        const rels = grids.length;

        // Verify that relations are unique.
        if (rels !== (new Set(grids)).size) {
            return callback(new Error('Duplicate grids found for phrase: ' + id));
        }

        let l = grids.length;
        while (l--) {
            const grid = decode(grids[l]);
            stats.total++;
            stats.byScore[grid.score]++;
            stats.byRelev[grid.relev.toFixed(1)]++;
        }
    }

    return callback(null, stats);
};

