var termops = require('./util/termops');

// determine whether it's a forward, reverse, or id query
module.exports = getQueryType;
function getQueryType(geocoder, query) {
    var queryType = '';
    var asId = termops.id(geocoder.bytype, query);
    var tokenized = termops.tokenize(query, true);

    if (asId) {
        queryType = 'id';
    } else if (tokenized.length === 2 &&
        'number' === typeof tokenized[0] &&
        'number' === typeof tokenized[1]) {
        queryType = 'reverse'
    } else {
        queryType = 'forward'
    }
    return queryType;
}