// Resolve the UTF-8 encoding stored in grids to simple number values.
module.exports.resolveCode = function(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
};

// Sort degenerate terms by the encoded deleted character distance (ad,bd)
// from the original term ID. Terms closer to the original term occur first
// in the sorted list.
module.exports.sortDegens = function(a, b) {
    var ad = a % 16;
    var bd = b % 16;
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
};

// Converts id + zxy coordinates into an array of zxy IDs.
// z is omitted as it can be derived from source maxzoom metadata.
// x and y are encoded as multiples of Math.pow(2,14) (making z14 the
// maximum zoom level) leaving Math.pow(2,25) distinct values for IDs.

// Caching shows a 6% perf bump
var mp39 = Math.pow(2,39),
    mp25 = Math.pow(2,25);

module.exports.zxy = function(id, zxy) {
    zxy = zxy.split('/');
    return ((zxy[1]|0) * mp39) + ((zxy[2]|0) * mp25) + id;
};

// Clean up internal fields/prep a feature entry for external consumption.
module.exports.feature = function feature(id, type, data) {
    data.id = type + '.' + id;
    data.type = data.type || type;
    if ('string' === typeof data.bounds)
        data.bounds = data.bounds.split(',').map(parseFloat);
    if ('search' in data)
        delete data.search;
    if ('rank' in data)
        delete data.rank;
    for (var key in data) if (key[0] === '_') delete data[key];
    return data;
};
