var distance = require('turf-distance');
var point = require('turf-point');

module.exports = dedupe;

function dedupe(features) {
    var deduped = [];
    var by_address = {};
    var by_place_name = {};

    for (var i = 0; i < features.length; i++) {
        var feature = features[i];

        if (feature.address) {
            var address = feature.address + ' ' + feature.text;
            var previous = by_address[address];
            if (previous && distance(previous.point, point(feature.center), 'kilometers') < 10) {
                if (deduped[previous.index].geometry.omitted && !feature.geometry.omitted) {
                    deduped[previous.index] = feature;
                } else if (deduped[previous.index].geometry.interpolated && !feature.geometry.interpolated) {
                    deduped[previous.index] = feature;
                } else {
                    continue;
                }
            } else {
                by_address[address] = {
                    point: point(feature.center),
                    index: deduped.length
                };
                deduped.push(feature);
            }
        } else {
            var place_name = feature.place_name;
            if (by_place_name[place_name]) {
                continue;
            } else {
                by_place_name[place_name] = place_name;
                deduped.push(feature);
            }
        }
    }

    return deduped;
}
