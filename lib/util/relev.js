// Prototype for relevance relevd rows of Carmen.search.
// Defined to take advantage of V8 class performance.
module.exports = function Relev(id, relev, reason, count, idx, dbid, dbname, tmpid) {
    this.id = id;

    // relev represents a score based on comparative term weight
    // significance alone. If it passes this threshold check it is
    // adjusted based on degenerate term character distance (e.g.
    // degens of higher distance reduce relev score).
    this.relev = relev;

    // reason is a bit mask of positions of matching terms as 1s
    this.reason = reason;
    this.count = count;
    this.idx = idx;

    // db is actually the dbname, which is a string like `'place'`
    this.dbid = dbid;
    this.dbname = dbname;

    this.tmpid = tmpid;
};
