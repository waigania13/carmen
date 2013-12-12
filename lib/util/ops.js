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

// Sort weighted terms by their encoded weight.
module.exports.sortWeighted = function(a, b) {
    var aw = a % 16;
    var bw = b % 16;
    return aw > bw ? -1 : aw < bw ? 1 : 0;
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

// Reformat a context array into a GeoJSON feature.
module.exports.toFeature = function(context, child) {
    var gettext = function(f) { return f._text.split(',')[0] };
    var feature = {
        id: context[0]._extid,
        type: 'Feature',
        text: gettext(context[0]),
        place_name: context.map(gettext).join(', ')
    };
    if ('lon' in context[0] && 'lat' in context[0]) {
        feature.center = [context[0].lon, context[0].lat];
    }
    if (context[0].bounds) {
        feature.bbox = context[0].bounds.split(',').map(parseFloat);
    }
    feature.properties = {};
    for (var key in context[0]) if (key[0] !== '_') {
        feature.properties[key] = context[0][key];
    }
    if (!child && context.length > 1) {
        feature.context = [];
        for (var i = 1; i < context.length; i++) {
            feature.context.push({
                id: context[i]._extid,
                text: gettext(context[i])
            });
        }
    }
    return feature;
};

