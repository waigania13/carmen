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

module.exports.grid = function(grid) {
    return {
        x: Math.floor(grid / mp39),
        y: Math.floor(grid % mp39 / mp25),
        id: Math.floor(grid % mp25)
    };
};

// Reformat a context array into a GeoJSON feature.
module.exports.toFeature = function(context) {
    var feat = context[0];
    if (!feat._center && !feat._legacy) throw new Error('Feature has no _center');
    if (!feat._extid)  throw new Error('Feature has no _extid');

    var gettext = function(f) {
        if (!f._text && !f._legacy) throw new Error('Feature has no _text');
        return (f._text||'').split(',')[0];
    };
    var feature = {
        id: feat._extid,
        type: 'Feature',
        text: gettext(feat),
        place_name: (feat._address ? feat._address + ' ' : '') + context.map(gettext).join(', '),
        relevance: context._relevance
    };
    if (feat._center) {
        feature.center = feat._geometry && feat._geometry.type === 'Point' ?
            feat._geometry.coordinates :
            feat._center;
        feature.geometry = feat._geometry || {
            type: 'Point',
            coordinates: feat._center
        };
    // This case is meant *only* for legacy carmen sources which supported
    // features without geometries.
    } else {
        feature.geometry = null;
    }
    if (feat._bbox) feature.bbox = feat._bbox;
    if (feat._address) feature.address = feat._address;
    feature.properties = {};
    for (var key in context[0]) if (key[0] !== '_') {
        feature.properties[key] = context[0][key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (var i = 1; i < context.length; i++) {
            if (!context[i]._extid) throw new Error('Feature has no _extid');
            feature.context.push({
                id: context[i]._extid,
                text: gettext(context[i])
            });
        }
    }
    return feature;
};
