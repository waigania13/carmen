'use strict';

/**
 * Dedupe features
 *
 * @param {Array<object>} features - array of features
 * @return {Array<object>} array of deduped features
 */
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

    // Re-sort array if we've changed composition
    if (features.length !== a.length) {
        a.sort((a, b) => b.relevance - a.relevance);
    }

    return a;
}

module.exports = dedupe;
