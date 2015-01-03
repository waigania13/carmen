// Return a "usage" relev by comparing a set of sets elements against the
// input query. Each sets element must include the following keys: relev,
// reason, idx.
//
// Mutates the original sets array by setting to false any elements whose
// phrase matches did not contribute to the final relev.
//
// @param {Array} query: an array of terms in a query, given as strings.
// @param {Array} sets: an array of reasons for matches being relevant
// @returns {Number} a number representing how relevant the array
// of reasons have made this term.
module.exports = function(queryLength, sets) {
    var relevance = 0,
        querymask = 0,
        reason2db = {},
        lastdb = -1,
        gappy = 0,
        count = 0,
        usage = 0,
        tally = 0;

    // For each set, score its correspondence with the query
    for (var i = 0; i < sets.length; i++) {
        // Each db may contribute a distinct matching reason to the final
        // relev. If this entry is for a db that has already contributed
        // but without the same reason mark it as false.
        if (lastdb === sets[i].idx) {
            if (reason2db[sets[i].reason] !== sets[i].idx) sets[i] = false;
            continue;
        }

        usage = 0;
        count = sets[i].count;

        for (var j = 0; j < queryLength; j++) {
            if (
                // make sure this term has not already been counted for
                // relevance. Uses a bitmask to mark positions counted.
                !(querymask & (1<<j)) &&
                // if this term matches the reason bitmask for relevance
                (1 << j & sets[i].reason)
            ) {
                ++usage;
                ++tally;
                // 'check off' this term of the query so that it isn't
                // double-counted against a different `sets` reason.
                querymask += 1<<j;
                // once a set's term count has been exhausted short circuit.
                // this prevents a province match from grabbing both instances
                // of 'new' and 'york' in a 'new york new york' query.
                if (!--count) break;
            }
        }

        // If this relevant criteria matched any terms in the query,
        // increment the total relevance score.
        if (usage) {
            relevance += sets[i].relev * (usage / queryLength);
            reason2db[sets[i].reason] = sets[i].idx;
            if (lastdb >= 0) gappy += (Math.abs(sets[i].idx - lastdb) - 1);
            lastdb = sets[i].idx;
            if (tally === queryLength) break;
        } else {
            sets[i] = false;
        }
    }

    // Penalize relevance slightly based on whether query matches contained
    // "gaps" in continuity between index levels.
    relevance -= 0.01 * gappy;

    return relevance;
};
