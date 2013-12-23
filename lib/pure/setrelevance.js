// Return a "usage" relev by comparing a set of sets elements against the
// input query. Each sets element must include the following keys: relev,
// reason, db.
//
// @param {Array} query: an array of terms in a query, given as strings.
// @param {Array} sets: an array of reasons for matches being relevant
// @returns {Number} a number representing how relevant the array
// of reasons have made this term.
module.exports = function(query, sets) {

    // Clone original query tokens so that this function does not
    // change them by reference. These will be crossed off one
    // by one to ensure each query token only counts once towards
    // the final relev.
    query = query.slice(0);

    var relevance = 0,
        total = query.length,
        dbusage = {},
        lastdb = false,
        usage = 0,
        // reason is a bit mask of positions of matching terms
        reason;

    // For each set, score its correspondence with the query
    for (var i = 0; i < sets.length; i++) {
        if (lastdb === sets[i].db) continue;

        usage = 0;

        for (var j = 0; j < query.length; j++) {
            var key = sets[i].db + '.' + query[j];
            if (
                // make sure this term has not already been counted for
                // relevance
                query[j] &&
                // if this term matches the reason bitmask for relevance
                (1 << j & sets[i].reason) &&
                // check that a duplicate instance of this term has not been
                // used by this db, e.g. in the query
                //
                //     new york new york
                //
                // this prevents a province match from grabbing both instances
                // of 'new' and 'york'.
                !dbusage[key]
            ) {
                ++usage;
                // 'check off' this term of the query so that it isn't
                // double-counted against a different `sets` reason.
                query[j] = false;
                // 'check off' this term of the query against duplicate
                // instances of the term.
                dbusage[key] = true;
            }
        }

        // If this relevant criteria matched any terms in the query,
        // increment the total relevance score.
        if (usage) {
            relevance += sets[i].relev * (usage / total);
            lastdb = sets[i].db;
        }
    }

    return relevance;
};
