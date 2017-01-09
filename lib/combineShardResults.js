// process n FeatureCollections into a single FeatureCollection

var dedupe = require('./util/dedupe.js');
var ops = require('./util/ops.js');
var sortFeature = require('./verifymatch').sortFeature;
var sortContext = require('./verifymatch').sortContext;

module.exports = combineResults;

function combineResults(results, options) {
    var rawFeatureCollections = [];
    var formattedFeatures = [];
    var finalFeatures = [];

    // this might need fixing for more complete features with contexts.
    for (var i = 0; i < results.length; i++) {
        var collection = results[i];
        collection.features.sort(sortContext);

        for (var j = 0; j < collection.features.length; j++) {
            rawFeatureCollections.push(collection.features[j]);
        }

    }

    for (var k = 0; k < rawFeatureCollections.length; k++) {
        var format = rawFeatureCollections[k]._formats;
        var feature = ops.toFeature(rawFeatureCollections[k], format, options.language, options.debug);
        formattedFeatures.push(feature);
    }

    finalFeatures = formattedFeatures;

    // dedupe features
    if (!options.allow_dupes) finalFeatures = dedupe(finalFeatures);
    console.log('features deduped:', formattedFeatures.length - finalFeatures.length);

    // limit combined features to limit parameter
    results.features = finalFeatures.slice(0, options.limit);

    return results;
}
