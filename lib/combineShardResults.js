// process n FeatureCollections into a single FeatureCollection

module.exports = combineResults;

function combineResults(results) {
    console.log('results', results);
    var features = [];
    for (var i = 0; i < results.length; i++) {
        var collection = results[i];
        for (var j = 0; j < collection.features.length; j++) {
            features.push(collection.features[j].place_name);
        }

    }
    // sort/dedupe features
    return features;
}