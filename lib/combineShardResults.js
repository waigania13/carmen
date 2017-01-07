// process n FeatureCollections into a single FeatureCollection

var dedupe = require('./util/dedupe.js');
var ops = require('./util/ops.js');
var sortFeature = require('./verifymatch').sortFeature;
var sortContext = require('./verifymatch').sortContext;

module.exports = combineResults;

function combineResults(results, options) {
    // console.log('results', results);
    var rawFeatures = [];
    var finalFeatures = [];
    for (var i = 0; i < results.length; i++) {
        var collection = results[i];
        for (var j = 0; j < collection.features.length; j++) {
            rawFeatures.push(collection.features[j][0]);
        }

    }
    // console.log('rawFeatures', rawFeatures[0].properties['carmen:index']);

    // sort raw features
    // rawFeatures.sort(sortFeature);
    // rawFeatures.sort(sortContext);

    // for (var k = 0; k < rawFeatures.length; k++) {
    //     // need to handle format
    //     var feature = ops.toFeature(rawFeatures[i], formats, options.language, options.debug);
    //     finalFeatures.push(feature);
    // }

    // dedupe features
    // var dedupedFeatures = dedupe(features);
    // console.log('features deduped:', features.length - dedupedFeatures.length);
    // dedupedFeatures.sort(sortFeature);

    console.log('result:', rawFeatures[0]);
    return rawFeatures;
}