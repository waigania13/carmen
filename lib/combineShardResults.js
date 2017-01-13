// process n FeatureCollections into a single FeatureCollection

var dedupe = require('./util/dedupe.js');
var ops = require('./util/ops.js');
var sortContext = require('./verifymatch').sortContext;

module.exports = combineResults;

function combineResults(results, options) {
    var rawFeatureCollections = [];
    var formattedFeatures = [];
    var finalFeatures = [];
    // steal the feature collection format
    var combinedResults = results[0];

    // this might need fixing for more complete features with contexts.
    for (var i = 0; i < results.length; i++) {
        var collection = results[i];

        for (var j = 0; j < collection.features.length; j++) {
            rawFeatureCollections.push(collection.features[j]);
        }

    }
    // sort results based on relev, score, etc.
    rawFeatureCollections.sort(sortContext);

    for (var k = 0; k < rawFeatureCollections.length; k++) {
        var format = rawFeatureCollections[k]._formats;
        var feature = ops.toFeature(rawFeatureCollections[k], format, options.language, options.debug);
        formattedFeatures.push(feature);
    }

    finalFeatures = formattedFeatures;

    // dedupe features
    if (!options.allow_dupes) finalFeatures = dedupe(finalFeatures);

    // limit combined features to limit parameter
    combinedResults.features = finalFeatures.slice(0, options.limit);

    return combinedResults;
}
