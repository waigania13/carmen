// process n FeatureCollections into a single FeatureCollection

var dedupe = require('./util/dedupe.js');
var ops = require('./util/ops.js');
var sortFeature = require('./verifymatch').sortFeature;
var sortContext = require('./verifymatch').sortContext;

module.exports = combineResults;

function combineResults(results, options) {
    console.log('results', results);
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
    // console.log('rawFeature', rawFeatureCollections[0]);

    // // sort raw features
    // rawFeatureCollections.sort(sortFeature);
    // rawFeatureCollections.sort(sortContext);

    for (var k = 0; k < rawFeatureCollections.length; k++) {
        var format = rawFeatureCollections[k]._formats;
        var feature = ops.toFeature(rawFeatureCollections[k], format, options.language, options.debug);
        formattedFeatures.push(feature);
    }

    // console.log(JSON.stringify(formattedFeatures, null, 2));

    finalFeatures = formattedFeatures;

    // dedupe features
    if (!options.allow_dupes) finalFeatures = dedupe(finalFeatures);
    console.log('features deduped:', formattedFeatures.length - finalFeatures.length);

    results.features = finalFeatures;

    return results;
}
