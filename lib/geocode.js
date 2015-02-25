var sm = new (require('sphericalmercator'))(),
    ops = require('./util/ops'),
    phrasematch = require('./phrasematch'),
    context = require('./context'),
    termops = require('./util/termops'),
    spatialmatch = require('./spatialmatch'),
    verifymatch = require('./verifymatch'),
    queue = require('queue-async'),
    feature = require('./util/feature'),
    Relev = require('./util/relev'),
    DEBUG = process.env.DEBUG ? {count: 0, id: parseInt(process.env.DEBUG)}: null; //Contains the feature id to track through

module.exports = function(geocoder, query, options, callback) {
    options = options || {};
    options.stats = options.stats || false;
    options.limit = options.limit || 5;

    //Proximity is currently not enabled
    if (options.proximity) {
        if (typeof options.proximity !== "object" || options.proximity.length !== 2)
            return callback("Proximty must be latlng array pair", null);
        if (typeof options.proximity[0] !== "number" || typeof options.proximity[1] !== "number")
            return callback("Proximty array must be numeric", null);
        if (options.proximity[0] < -90 || options.proximity[0] > 90 || options.proximity[1] < -180 || options.proximity[1] > 180)
            return callback("Proximity LatLng Pair out of bounds", null);
    }

    // Allows user to search for specific ID
    var asId = termops.id(geocoder.byname, query);
    if (asId) return idGeocode(geocoder, asId, options, callback);

    // Reverse geocode: lon,lat pair. Provide the context for this location.
    var tokenized = termops.tokenize(query, true);
    if (tokenized.length === 2 &&
        'number' === typeof tokenized[0] &&
        'number' === typeof tokenized[1]) {
        return reverseGeocode(geocoder, tokenized, options, callback);
    }

    // Forward geocode.
    return forwardGeocode(geocoder, query, options, callback);
};

function idGeocode(geocoder, asId, options, callback) {
    var q = queue();
    var extid = asId.dbname + '.' + asId.id;
    var indexes = geocoder.byname[asId.dbname];
    for (var i = 0; i < indexes.length; i++) {
        q.defer(function(source, feat, done) {
            feature.getFeature(source, feat, function (err, data) {
                if (err) return done(err);
                if (!data) return done();
                data = data[asId.id];
                data._extid = extid;
                done(null, data);
            });
        }, indexes[i], termops.feature(asId.id));
    }
    q.awaitAll(function(err, features) {
        if (err) return callback(err);
        var result = {
            "type": "FeatureCollection",
            "query": [extid],
            "features": []
        };
        for (var i = 0; i < features.length; i++) {
            if (!features[i]) continue;
            var f = ops.toFeature([features[i]]);
            f.relevance = features[i]._score || 0;
            result.features.push(f);
        }
        return callback(null, result);
    });
}

function reverseGeocode(geocoder, tokenized, options, callback) {
    var queryData = {
        type: 'FeatureCollection',
        query: tokenized
    };
    context(geocoder, queryData.query[0], queryData.query[1], null, true, function(err, context) {
        if (err) return callback(err);
        context._relevance = 1;
        queryData.features = [];
        while (context.length) {
            try {
                queryData.features.push(ops.toFeature(context));
            } catch(err) {
                return callback(err);
            }
            context.shift();
        }
        return callback(null, queryData);
    });
}

var uniq = require('./util/uniq');
var idmod = Math.pow(2,25);

function forwardGeocode(geocoder, query, options, callback) {
    var queryData = {
        type: 'FeatureCollection',
        query: termops.tokenize(query)
    };
    var zooms = [];
    var stats = {};
    var q = queue();
    stats.totalTime = +new Date();

    // keyword search. Find matching features.
    stats.searchTime = +new Date();

    var mp25 = Math.pow(2,25);
    var mp33 = Math.pow(2,33);

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    for (var dbid in geocoder.indexes) q.defer(phrasematch, geocoder.indexes[dbid], query);
    q.awaitAll(function(err, results) {
        if (err) return callback(err);

        var grids = [];
        var features = {};
        var dbids = Object.keys(geocoder.indexes);
        for (var i = 0; i < results.length; i++) {
            if (DEBUG) {
                for (var j = 0; j < results[i].grids.length; j++) {
                    if (ops.grid(results[i].grids[j]).id === DEBUG.id) {
                        DEBUG.grid = results[i].grids[j];
                        DEBUG.count++;
                    }
                }
            }

            var dbid = dbids[i];
            grids.push(results[i].grids);
            zooms.push(geocoder.indexes[dbid]._geocoder.zoom);

            if (!results[i].grids.length) continue;

            var dbidx = i;
            var dbname = geocoder.indexes[dbid]._geocoder.name;
            var dbcache = geocoder.indexes[dbid]._geocoder;
            var relevs = results[i].relevs;
            var phrases = results[i].phrases;
            var maxrelev = {};

            // Associate the relevance score of each phrase with its
            // associated features.
            for (var a = 0; a < phrases.length; a++) {
                var phrase = phrases[a];
                var relev = (relevs[phrase]/mp33|0) * mp33;
                var featgrids = dbcache.get('grid', phrase);
                for (var b = 0; b < featgrids.length; b++) {
                    var feat = featgrids[b] % idmod;
                    var tmpid = dbidx * 1e8 + feat;
                    if (features[tmpid] && maxrelev[tmpid] >= relev) continue;
                    features[tmpid] = relev + (dbidx*mp25) + feat;
                    maxrelev[tmpid] = relev;
                }
            }
        }
        if (DEBUG) console.log('DEBUG: PhraseMatch  grid:', DEBUG.grid, 'contains id:', DEBUG.id, 'relev:', new Relev(features[DEBUG.id]).relev, 'count:', DEBUG.count);
        searchComplete(null, features, grids, zooms);
    });

    // ## searchComplete
    //
    // Calls the callback to `geocode` when complete. Called once per
    // call to `geocode`.
    //
    // @param {Object} err an error potentially given by the caller
    // @param {Array} feats a list of feature objects
    // @param {Array} grids a list of grid objects
    // @param {Array} zooms a list of zoom numbers
    function searchComplete(err, feats, grids, zooms) {
        if (err) return callback(err);
        spatialmatch(queryData.query, stats, geocoder, feats, grids, zooms, options, spatialmatchComplete);
    }

    function spatialmatchComplete(err, matched) {
        if (err) return callback(err);
        if (DEBUG && matched.sets[DEBUG.id]) {
            console.log('DEBUG: SpatialMatch grid:', DEBUG.grid, 'contains id:', DEBUG.id);
        }

        verifymatch(queryData.query, stats, geocoder, matched, options, function(err, contexts) {
            if (err) return callback(err);

            if (DEBUG) {
                for (var x = 0; x < contexts.length; x++) {
                    for (var y = 0; y < contexts[x].length; y++) {
                        if (contexts[x][y]._id === DEBUG.id)
                            console.log('DEBUG: VerfyMatch   grid:',DEBUG.grid, 'contains id:', DEBUG.id, 'relev:', contexts[x][y]._relev )
                    }
                }
            }

            try {
                queryData.features = contexts.slice(0, options.limit).map(ops.toFeature);
            } catch(err) {
                return callback(err);
            }
            stats.relev = contexts.length ? contexts[0]._relevance : 0;
            stats.totalTime = (+new Date()) - stats.totalTime;

            if (options.stats) queryData.stats = stats;
            return callback(null, queryData);
        });
    }
}
