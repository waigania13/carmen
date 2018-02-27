'use strict';
const uniq = require('./util/uniq');
const decode = require('./util/grid').decode;

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
        if (rels !== uniq(grids).length) {
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

