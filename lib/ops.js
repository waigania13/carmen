// Resolve the UTF-8 encoding stored in grids to simple number values.
module.exports.resolveCode = function(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
};

// TODO: why?
module.exports.sortMod4 = function(a, b) {
    var ad = a % 4;
    var bd = b % 4;
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
};

// Converts id + zxy coordinates into an array of zxy IDs.
// z is omitted as it can be derived from source maxzoom metadata.
// x and y are encoded as multiples of Math.pow(2,14) (making z14 the
// maximum zoom level) leaving Math.pow(2,25) distinct values for IDs.
module.exports.zxy = function(id, zxy) {
    zxy = zxy.split('/');
    return ((zxy[1]|0) * Math.pow(2,39)) + ((zxy[2]|0) * Math.pow(2,25)) + id;
};
