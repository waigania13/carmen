'use strict';

function dedupe(features) {
    // dedupe strictly by place name
    const a = [];
    const by_place_name = {};
    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const previous = by_place_name[feature.place_name];
        if (previous) {
            if (a[previous.index].geometry.omitted && !feature.geometry.omitted) {
                a[previous.index] = feature;
            } else {
                continue;
            }
        } else {
            by_place_name[feature.place_name] = {
                feature: feature,
                index: a.length
            };
            a.push(feature);
        }
    }

    a.sort((a, b) => {
        if (a.relevance > b.relevance) return -1;
        if (a.relevance < b.relevance) return 1;
        return 0;
    });

    return a;
}

module.exports = dedupe;
