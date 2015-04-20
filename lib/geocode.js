var sm = new (require('sphericalmercator'))(),
    ops = require('./util/ops'),
    phrasematch = require('./phrasematch'),
    SphericalMercator = require('sphericalmercator'),
    context = require('./context'),
    termops = require('./util/termops'),
    spatialmatch = require('./spatialmatch'),
    verifymatch = require('./verifymatch'),
    queue = require('queue-async'),
    feature = require('./util/feature'),
    Relev = require('./util/relev'),
    distance = require('turf-distance'),
    Point = require('turf-point');
var dedupe = require('./util/dedupe');
var sm = new SphericalMercator();

module.exports = function(geocoder, query, options, callback) {
    options = options || {};
    options.stats = options.stats || false;
    options.limit = options.limit || 5;
    options.debug = options.debug ? {
        extid: options.debug,
        id: options.debug % Math.pow(2,25),
        grids: []
    } : false;
    options.allow_dupes = options.allow_dupes || false;

    //Proximity is currently not enabled
    if (options.proximity) {
        if ( !options.proximity instanceof Array || options.proximity.length !== 2)
            return callback("Proximty must be latlng array pair", null);
        if (typeof options.proximity[0] !== "number" || isNaN(options.proximity[0]) || isNaN(options.proximity[1]) || typeof options.proximity[1] !== "number")
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
        try {
            while (context.length) {
                queryData.features.push(ops.toFeature(context, geocoder.byidx[context[0]._dbidx]._geocoder.geocoder_address));
                context.shift();
            }
        } catch(err) {
            return callback(err);
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
    var grids = [];
    var stats = {};
    var q = queue();

    if (options.stats) {
        var stats = {};
        stats.time = +new Date();
        stats.phrasematch = {};
        stats.spatialmatch = {};
        stats.verifymatch = {};
        stats.phrasematch.time = +new Date();
    }

    var mp25 = Math.pow(2,25);
    var mp33 = Math.pow(2,33);

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    for (var dbid in geocoder.indexes) q.defer(phrasematch, geocoder.indexes[dbid], query);
    q.awaitAll(function(err, results) {
        if (err) return callback(err);

        var features = {};
        var dbids = Object.keys(geocoder.indexes);
        if (options.debug) options.debug.phrasematch = { count: 0 };

        for (var i = 0; i < results.length; i++) {
            if (options.debug) {
                for (var j = 0; j < results[i].grids.length; j++) {
                    if (ops.grid(results[i].grids[j]).id === options.debug.id) {
                        var unpack = ops.grid(results[i].grids[j])
                        options.debug.grids.push({
                            grid: results[i].grids[j],
                            x: unpack.x,
                            y: unpack.y
                        });
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
            var a = phrases.length;
            while (a--) {
                var phrase = phrases[a];
                var relev = (relevs[phrase]/mp33|0) * mp33;
                var featgrids = dbcache.get('grid', phrase);
                var b = featgrids.length;
                while (b--) {
                    var feat = featgrids[b] % idmod;
                    var tmpid = (dbidx*mp25) + feat;
                    if (features[tmpid] && maxrelev[tmpid] >= relev) continue;
                    features[tmpid] = relev + (dbidx*mp25) + feat;
                    maxrelev[tmpid] = relev;
                }
            }
        }
        if (options.debug) for (tmpid in features) {
            if (tmpid % mp25 !== options.debug.id) continue;
            options.debug.phrasematch = new Relev(features[tmpid]);
        }
        if (options.stats) {
            stats.phrasematch.time = +new Date - stats.phrasematch.time;
            stats.phrasematch.count = Object.keys(features).length;
        }
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
        if (options.stats) stats.spatialmatch.time = +new Date;
        spatialmatch(queryData.query, stats, geocoder, feats, grids, zooms, options, spatialmatchComplete);
    }

    function spatialmatchComplete(err, matched) {
        if (err) return callback(err);

        function toCenter(bbox) { return sm.forward([bbox[0] - bbox[3], bbox[1] - bbox[3]]); }

        // Debug:
        // Determine what position the traced feature is at in the spatialmatch
        // resultset and decode the relev object. Provide the stack that calculated
        // the feature's relev.
        if (options.debug) for (var i = 0; i < matched.results.length; i++) {
            var r = new Relev(matched.results[i]);
            if (r.id !== options.debug.id) continue;
            options.debug.spatialmatch_position = i;
            options.debug.spatialmatch_toprelev = new Relev(matched.results[0]).relev;
            options.debug.spatialmatch_relev = r;
            for (var k in matched.coalesced) {
                if (!matched.coalesced[k].some(function(tmpid) {
                    return tmpid === r.tmpid;
                })) continue;
                options.debug.spatialmatch_stack = matched.coalesced[k].map(function(tmpid) {
                    return new Relev(matched.sets[tmpid]);
                });
            }
        }
        if (options.stats) {
            stats.spatialmatch.time = +new Date - stats.spatialmatch.time;
            stats.spatialmatch.count = matched.results.length;
            stats.verifymatch.time = +new Date;
        }

        //If proximity is set, terms that tie in relev will be ordered by distance
        //This is performed as verify match has a cutoff of the first 40 results
        if (options.proximity) {
            //Setup grid lookup - each layer is an object in the array with id->grid
            var gridlookup = [];
            for (var layer_it = 0; layer_it < grids.length; layer_it++) {
                gridlookup[layer_it] = {};
                for (var grid_it = 0; grid_it < grids[layer_it].length; grid_it++) {
                    tmpGrid = ops.grid(grids[layer_it][grid_it]);
                    gridlookup[layer_it][tmpGrid.id] = tmpGrid;
                }
            }
            //The centre of each tile is calculated in merc and then sorted
            var proxSM = sm.forward(options.proximity);
            matched.results.sort(function(a, b) {
                var res = [a,b].map(function(ele) { return new Relev(ele); });
                if (res[0].relev !== res[1].relev) return 0; //Only sort with same relev
                res = res.map(function(ele) {
                    var center = toCenter(sm.bbox(gridlookup[ele.idx][ele.id].x, gridlookup[ele.idx][ele.id].y, zooms[ele.idx]));
                    return Math.sqrt(Math.pow(center[0] - proxSM[0],2) + Math.pow(center[1] - proxSM[1],2));
                });
                if (res[0] < res[1]) return -1; //a is closer
                else if (res[1] < res[0]) return 1; //b is closer
                else return 0; //same
            });
        }

        verifymatch(queryData.query, stats, geocoder, matched, options, function(err, contexts) {
            if (err) return callback(err);

            if (options.debug) {
                options.debug.verifymatch = { count: 0, relev: 0 };
                for (var x = 0; x < contexts.length; x++) {
                    for (var y = 0; y < contexts[x].length; y++) {
                        if (contexts[x][y]._id !== options.debug.extid) continue;
                        options.debug.verifymatch = { relev: contexts[x][y]._relev, count: 1};
                    }
                }
            }
            if (options.stats) {
                stats.verifymatch.time = +new Date - stats.verifymatch.time;
                stats.verifymatch.count = contexts.length;
            }

            queryData.features = [];
            try {
                for (var i = 0; i < contexts.length; i++) {
                    var feature = ops.toFeature(contexts[i], geocoder.byidx[contexts[i][0]._dbidx]._geocoder.geocoder_address);
                    queryData.features.push(feature);
                }
            } catch(err) {
                return callback(err);
            }
            if (!options.allow_dupes) queryData.features = dedupe(queryData.features);

            queryData.features = queryData.features.slice(0, options.limit);

            if (options.stats) {
                stats.relev = contexts.length ? contexts[0]._relevance : 0;
                stats.time = (+new Date()) - stats.time;
                queryData.stats = stats;
            }

            //Second fine-grained proximity sort
            if (options.proximity) {
                queryData.features.sort(function(a, b) {
                    //Only sort features with same relev/idx level
                    if (a.relevance !== b.relevance) return 0;
                    if (a.id.split('.')[0] !== b.id.split('.')[0]) return 0;

                    var res = [a, b].map(function(ele) {
                        return distance(Point(options.proximity), Point(ele.center), 'miles');
                    });
                    if (res[0] < res[1]) return -1; //a is closer
                    else if (res[1] < res[0]) return 1; //b is closer
                    else return 0; //same
                });
            }

            if (options.debug) queryData.debug = options.debug;
            return callback(null, queryData);
        });
    }
}
