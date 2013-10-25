// Return a "usage" relev by comparing a set of relevd elements against the
// input query. Each relevd element must include the following keys: relev,
// reason, db.
module.exports = function(query, relevd) {

    // Clone original query tokens so that this function does not
    // change them by refernce. These will be crossed off one
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
        reason = relevd[i].reason;
        for (var j = 0; j < query.length; j++) {
            if ((1<<j & reason) && query[j]) {
                ++usage;
                query[j] = false;
            }
        }
        if (usage) {
            relev += relevd[i].relev * (usage / total);
            lastdb = relevd[i].db;
        }
    }

    return relev;
};
