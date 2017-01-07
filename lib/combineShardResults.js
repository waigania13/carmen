// process n FeatureCollections into a single FeatureCollection

var dedupe = require('./util/dedupe.js');
var sortFeature = require('./verifymatch').sortFeature;
var sortContext = require('./verifymatch').sortContext;

module.exports = combineResults;

function combineResults(results, options) {
    // console.log('results', results);
    var features = [];
    for (var i = 0; i < results.length; i++) {
        var collection = results[i];
        for (var j = 0; j < collection.features.length; j++) {
            features.push(collection.features[j]);
        }

    }
    // dedupe features
    var dedupedFeatures = dedupe(features);
    console.log('features deduped:', features.length - dedupedFeatures.length);

    // dedupedFeatures.sort(sortFeature);

    return dedupedFeatures;
}