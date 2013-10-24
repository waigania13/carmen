// Prototype for relevance relevd rows of Carmen.search.
// Defined to take advantage of V8 class performance.
module.exports = function Relev(id, relev, reason, idx, db, tmpid) {
    this.id = id;
    this.relev = relev;
    this.reason = reason;
    this.idx = idx;
    this.db = db;
    this.tmpid = tmpid;
};
