// Return a "usage" relev by comparing a set of relevd elements against the
// input query. Each relevd element must include the following keys: relev,
// reason, db.
//
// @param {Array} query: an array of terms in a query, given as strings.
// @param {Array} relevd: an array of reasons for matches being relevant
// @returns {Number} a number representing how relevant the array
// of reasons have made this term.
module.exports = function(query, relevd) {

    // Clone original query tokens so that this function does not
    // change them by reference. These will be crossed off one
    // by one to ensure each query token only counts once towards
    // the final relev.
    query = query.slice(0);

    var relev = 0,
        total = query.length,
        lastdb = false,
        usage = 0,
        // reason is a bit mask of positions of matching terms
        reason;

    for (var i = 0; i < relevd.length; i++) {
        if (lastdb === relevd[i].db) continue;

        usage = 0;

        for (var j = 0; j < query.length; j++) {
            if (
                // make sure this term has not already been counted for
                // relevance
                query[j] &&
                // if this term matches the reason bitmask for relevance
                (1 << j & relevd[i].reason)) {

                ++usage;
                // 'check off' this term of the query so that it isn't
                // double-counted against a different `relevd` reason.
                query[j] = false;

            }
        }

        // If this relevant criteria matched any terms in the query,
        // increment the total relevance score.
        if (usage) {
            relev += relevd[i].relev * (usage / total);
            lastdb = relevd[i].db;
        }
    }

    return relev;
};
