'use strict';
const addressItp = require('./pure/addressitp');
const addressCluster = require('./pure/addresscluster');
const queue = require('d3-queue').queue;
const context = require('./context');
const termops = require('./util/termops');
const feature = require('./util/feature');
const proximity = require('./util/proximity');
const closestLang = require('./util/closest-lang');
const bbox = require('./util/bbox');
const filter = require('./util/filter');
const constants = require('./constants');
const routablePoint = require('./pure/routablepoint');

module.exports = verifymatch;
module.exports.verifyFeatures = verifyFeatures;
module.exports.sortFeature = sortFeature;
module.exports.sortContext = sortContext;

/**
* verifymatch - results from spatialmatch are now verified by querying real geometries in vector tiles
*
* @access public
* @param {Array} query - a list of terms composing the query to Carmen
* @param {Object} stats - ?
* @param {Object} geocoder - a geocoder datasource
* @param {Object} matched - resultant indexes that could be spatially stacked
* @param {Object} options - passed through the geocode function in geocode.js
* @param {Function} callback - callback function which is called with the verified indexes in the correct hierarchical order
*/
function verifymatch(query, stats, geocoder, matched, options, callback) {
    let spatialmatches = matched.results;
    const sets = matched.sets;

    options.limit_verify = options.limit_verify || 10;
    // Limit covers based on whether their source is allowed by types & stacks filters.
    if (options.types || options.stacks) {
        spatialmatches = spatialmatches.filter((spatialmatch) => {
            const firstCover = spatialmatch.covers[0];
            const source = geocoder.byidx[firstCover.idx];
            // Currently unclear why this might be undefined.
            if (!source) console.error(new Error('Misuse: source undefined for idx ' + firstCover.idx));
            return source && filter.sourceAllowed(source, options);
        });
    }

    // Limit initial feature check to the best 20 max.
    if (spatialmatches.length > 20) spatialmatches = spatialmatches.slice(0,20);

    const q = queue(10);
    for (let i = 0; i < spatialmatches.length; i++) q.defer(loadFeature, spatialmatches[i], i);
    q.awaitAll(afterFeatures);

    // For each result, load the feature from its Carmen index.
    function loadFeature(spatialmatch, pos, callback) {
        const cover = spatialmatch.covers[0];
        const source = geocoder.byidx[cover.idx];

        // Currently unclear why this might be undefined.
        // For now, catch and return error to try to learn more.
        if (!source) return callback(new Error('Misuse: source undefined for idx ' + cover.idx));

        // getFeatureByCover() uses `getGeocoderData` to fetch a carmen record
        feature.getFeatureByCover(source, cover, callback);
    }

    // Once all features are loaded, filter, verify, and load contexts
    function afterFeatures(err, loaded) {
        if (err) return callback(err);

        let verified;

        // Limit each feature based on whether it is allowed by types & stacks filters.
        if (options.types || options.stacks || options.languageMode === 'strict') {
            const filteredSpatialmatches = [];
            const filteredLoaded = [];
            loaded.forEach((feature, i) => {
                if (!feature || !feature.properties) return;
                const source = geocoder.indexes[feature.properties['carmen:index']];
                if (source && filter.featureAllowed(source, feature, options)) {
                    filteredSpatialmatches.push(spatialmatches[i]);
                    filteredLoaded.push(loaded[i]);
                }
            });
            verified = verifyFeatures(query, geocoder, filteredSpatialmatches, filteredLoaded, options);
        // No filters specified, go straight to verify
        } else {
            verified = verifyFeatures(query, geocoder, spatialmatches, loaded, options);
        }
        // Limit verify results before loading contexts
        verified = verified.slice(0, options.limit_verify);

        loadContexts(geocoder, verified, sets, options, callback);
    }
}

/**
* verifyFeatures - filters the best results from the list of spatialmatches
* allows for high-scored features to beat local ones
* checks if features lie in a bbox supplied by the bbox option
* finds an address using a bitmask, incase none of the matched features contain the address
*
* @param {Array} query - a list of terms composing the query to Carmen
* @param {Object} geocoder - a geocoder datasource
* @param {Object} spatialmatches - resultant indexes that could be spatially stacked
* @param {Object} loaded - features that are loaded from the carmen index
* @param {Object} options - passed through the geocode function in geocode.js
* @returns filtered - sorted and verified features
*/
function verifyFeatures(query, geocoder, spatialmatches, loaded, options) {
    let meanScore = 1;
    const result = [];
    let feats;
    for (let pos = 0; pos < loaded.length; pos++) {
        if (!loaded[pos]) continue;

        feats = [loaded[pos]];

        const spatialmatch = spatialmatches[pos];
        const cover = spatialmatch.covers[0];
        const source = geocoder.byidx[cover.idx];

        // Calculate to see if there is room for an address in the query based on bitmask
        // This recognizes 100 in the query list - `['1', 'fake', 'street', '100']` and returns the position of the addressnumber (3) and the addressnumber (100)
        const address = termops.maskAddress(query, cover.text, cover.mask);

        if (source.geocoder_address) {

            if (address && (feats[0].properties['carmen:addressnumber'] || feats[0].properties['carmen:rangetype'])) {
                feats[0].properties['carmen:address'] = address.addr;

                let addressPoints = [];
                if (feats[0].properties['carmen:addressnumber']) {
                    addressPoints = addressCluster.forward(feats[0], address.addr);
                }

                if (!addressPoints.length && feats[0].properties['carmen:rangetype']) {
                    const itpPoint = addressItp.forward(feats[0], address.addr);
                    addressPoints = itpPoint ? [itpPoint] : [];
                }

                if (addressPoints.length) {
                    const newFeats = addressPoints.slice(0,10).map((addressPoint) => {
                        const feat = JSON.parse(JSON.stringify(feats[0]));
                        // Find the routable point if routable_points is not already set, and the addressPoint isn't interpolated
                        const routPoint = routablePoint(addressPoint, feat);
                        if (routPoint) {
                            // For now, return nearestPointCoords as an item in an array
                            // to support multiple routable points.
                            // TODO: eventually figure out how to identify and add multiple routable points.
                            feat.routable_points = [routPoint];
                        }

                        feat.geometry = addressPoint;
                        feat.properties['carmen:center'] = feat.geometry && feat.geometry.coordinates;
                        return feat;
                    });
                    feats = newFeats;
                } else {
                    // The feature is an address cluster or range but does not match this cover, skip it.
                    continue;
                }

            } else {
                feats[0].properties['carmen:address'] = null;
            }
        }

        for (const feat of feats) {
            // checks if the feature falls within the bbox specified as a part of the options
            if (options.bbox && !bbox.inside(feat.properties['carmen:center'], options.bbox)) continue;

            const lastType = feat.properties['carmen:types'].slice(-1)[0];
            feat.properties['carmen:score'] = feat.properties['carmen:score'] || 0;
            feat.properties['carmen:extid'] = lastType + '.' + feat.id;
            feat.properties['carmen:tmpid'] = cover.tmpid;
            feat.properties['carmen:relev'] = cover.relev;
            feat.properties['carmen:distance'] = proximity.distance(options.proximity, feat.properties['carmen:center'], cover);
            feat.properties['carmen:position'] = pos;
            feat.properties['carmen:spatialmatch'] = spatialmatch;
            feat.properties['carmen:geocoder_address_order'] = source.geocoder_address_order;
            feat.properties['carmen:zoom'] = cover.zoom;
            if (feat.properties['carmen:score'] > 0) meanScore *= feat.properties['carmen:score'];
            result.push(feat);
        }
    }

    // Use a geometric mean for calculating final _scoredist.
    // This allows extremely high-scored outliers to beat local
    // results unless within an extremely close proximity.
    if (result.length) meanScore = Math.pow(meanScore, 1 / result.length);
    // Set a score + distance combined heuristic.
    for (let k = 0; k < result.length; k++) {
        const feat = result[k];
        // ghost features don't participate
        if (options.proximity && feat.properties['carmen:score'] >= 0) {
            feat.properties['carmen:scoredist'] = Math.max(
                feat.properties['carmen:score'],
                proximity.scoredist(meanScore, feat.properties['carmen:distance'], feat.properties['carmen:zoom'], constants.PROXIMITY_RADIUS)
            );
        } else {
            feat.properties['carmen:scoredist'] = feat.properties['carmen:score'];
        }
    }

    // Sort + disallow more than options.limit_verify of
    // the best results at this point.
    result.sort(sortFeature);

    // Eliminate any score < 0 results if there are better-scored results
    // with identical text.
    const filtered = [];
    const byText = {};
    for (let i = 0; i < result.length; i++) {
        const feat = result[i];
        const languageText = options.language ? closestLang(options.language[0], feat.properties, 'carmen:text_') : false;
        const text = languageText || feat.properties['carmen:text'];
        if (feat.properties['carmen:scoredist'] >= 0 || !byText[text]) {
            filtered.push(feat);
            byText[text] = true;
        }
    }
    return filtered;
}

/**
* loadContexts returns the heirachy of the features
* @param {Object} geocoder - a geocoder datasource
* @param {Object} features - geojson feature
* @param {Object} sets - covers for the features that have been verified
* @param {Object} options -  passed through the geocode function in geocode.js
* @param {Function} callback - callback called with the features in the the appropriate heirachical order
*/
function loadContexts(geocoder, features, sets, options, callback) {
    const q = queue(5);
    for (let i = 0; i < features.length; i++) q.defer((f, done) => {
        const name = geocoder.indexes[f.properties['carmen:index']].name;
        const firstidx = geocoder.byname[name][0].idx;
        context(geocoder, f.properties['carmen:center'], {
            maxtype: f.properties['carmen:extid'].split('.')[0],
            maxidx: firstidx,
            matched: sets,
            language: options.language
        }, (err, context) => {
            if (err) return done(err);
            // Push feature onto the top level.
            context.unshift(f);
            return done(null, context);
        });
    }, features[i]);

    q.awaitAll((err, contexts) => {
        if (err) return callback(err);
        callback(null, verifyContexts(contexts, sets, geocoder.indexes));
    });
}

/**
* verifyContexts - Create lookup for peer contexts to use real loaded feature score values rather than cover `scoredist` which is a gross * approximation based on an index's scorefactor
*
* @params {Object} contexts - features in sorted by context to be verified on basis of scoring by verifyContexts
* @params {Object} sets - covers for the features that have been verified
* @params {Object} indexes - indexes in the instance of the geocoder for e.g: {country: {}, region: {}, place:{}}
* @returns {Object} contexts - feature hierachy sorted by the score value
*/
function verifyContexts(contexts, sets, indexes) {
    const peers = {};
    for (let c = 0; c < contexts.length; c++) {
        peers[contexts[c][0].properties['carmen:tmpid']] = contexts[c][0];
    }

    for (let a = 0; a < contexts.length; a++) {
        const context = contexts[a];
        context._relevance = 0;
        context._typeindex = indexes[context[0].properties['carmen:index']].ndx;

        // Create lookup for covers by tmpid.
        const verify = {};
        let cover;
        const covers = context[0].properties['carmen:spatialmatch'].covers;
        for (let b = 0; b < covers.length; b++) {
            cover = covers[b];
            verify[cover.tmpid] = cover;
        }

        for (const ctx of context) {
            if (verify[ctx.properties['carmen:tmpid']]) {
                cover = verify[ctx.properties['carmen:tmpid']];
                ctx.properties['carmen:matches_language'] = cover.matches_language;
                ctx.properties['carmen:prefix'] = cover.prefix;
                ctx.properties['carmen:query_text'] = cover.text;
                ctx.properties['carmen:idx'] = cover.idx;
            }
        }

        const strictRelev = verifyContext(context, peers, verify, {}, indexes);
        const looseRelev = verifyContext(context, peers, verify, sets, indexes);
        context._relevance = Math.max(strictRelev, looseRelev);
    }
    contexts.sort(sortContext);
    return contexts;
}

/**
https://github.com/mapbox/geocoding/issues/302
*/
function verifyContext(context, peers, strict, loose, indexes) {
    const addressOrder = context[0].properties['carmen:geocoder_address_order'];
    let usedmask = 0;
    let lastmask = -1;
    let lastgroup = -1;
    let relevance = 0;
    let direction;
    // 'squishy' checks for nested, identically-named features in indexes
    //  with geocoder_inherit_score enabled. When they are encountered, avoid
    // applying the gappy penalty and combine their scores on the smallest
    // feature.
    // This ensures that a context of "New York, New York, USA" will return
    // the place rather than the region when a query is made for "New York USA".
    // In the absence of this check the place would be gappy-penalized and the
    // region feature would be returned as the first result.
    let squishy = 0;
    let squishyTarget = false;
    if (indexes[context[0].properties['carmen:index']].geocoder_inherit_score)
        squishyTarget = context[0].properties;

    for (let c = 0; c < context.length; c++) {
        let backy = false;
        const feat = context[c];

        const matched = strict[feat.properties['carmen:tmpid']] || loose[feat.properties['carmen:tmpid']];
        if (!matched) continue;

        // Lookup and sum score from a peer feature if eligible.
        if (squishyTarget && (c > 0) && peers[feat.properties['carmen:tmpid']] && textAlike(squishyTarget, feat.properties))
            squishy += Math.max(peers[feat.properties['carmen:tmpid']].properties['carmen:score'] || 0, 0);

        if (usedmask & matched.mask) continue;

        // check if address components are orderd general-to-specific or specific-to-general
        if (!direction && c > 0) {
            direction = lastmask < matched.mask ? 'ascending' : 'descending';
        }

        if (lastgroup > -1) {
            // penalize stacking bonus if the order of address components is inconsistent
            if (direction === 'ascending') {
                backy = lastmask > matched.mask;
            } else if (direction === 'descending') {
                backy = lastmask < matched.mask;
            }
        }

        usedmask = usedmask | matched.mask;
        lastmask = matched.mask;
        lastgroup = indexes[feat.properties['carmen:index']].ndx;
        if (backy) {
            relevance += matched.relev * 0.5;
        } else {
            relevance += matched.relev;
        }
    }

    // small bonus if feature order matches the expected order of the index
    if (direction) relevance -= 0.01;
    if (addressOrder === direction) relevance += 0.01;

    // Penalize stacking bonus slightly based on whether stacking matches
    // contained "gaps" in continuity between index levels --
    // EXCEPT in the case of an eligible higher-level feature that shares an
    // exact carmen:text value with something in its context (e.g. New York, New York)
    if (squishy > 0)
        context[0].properties['carmen:scoredist'] += squishy;

    relevance = relevance > 0 ? relevance : 0;

    return relevance;
}

/**
* sortFeature - sorts the best results in the features according to the relevance, scoredist, position or if the address exists
*/
function sortFeature(a, b) {
    return (b.properties['carmen:spatialmatch'].relev - a.properties['carmen:spatialmatch'].relev) ||
        ((a.properties['carmen:address'] === null ? 1 : 0) - (b.properties['carmen:address'] === null ? 1 : 0)) ||
        ((a.geometry && a.geometry.omitted ? 1 : 0) - (b.geometry && b.geometry.omitted ? 1 : 0)) ||
        ((b.properties['carmen:scoredist'] || 0) - (a.properties['carmen:scoredist'] || 0)) ||
        ((a.properties['carmen:position'] || 0) - (b.properties['carmen:position'] || 0)) ||
        0;
}

/**
* sortContext - sort contexts based on the relevance, then score, layer type, address position, spatialmatch position and then id
*/
function sortContext(a, b) {
    // First, compute the relevance of this query term against
    // each set.
    if (a._relevance > b._relevance) return -1;
    if (a._relevance < b._relevance) return 1;

    // sort by score
    const as = a[0].properties['carmen:scoredist'] || 0;
    const bs = b[0].properties['carmen:scoredist'] || 0;
    if (as > bs) return -1;
    if (as < bs) return 1;

    // layer type
    if (a._typeindex < b._typeindex) return -1;
    if (a._typeindex > b._typeindex) return 1;

    if (a[0].properties['carmen:address'] && b[0].properties['carmen:address']) {
        // Prefer addresses with an earlier position in the query
        // so if you have a query "70 St. #501" it will prioritize 70
        if (a[0].properties['carmen:addresspos'] < b[0].properties['carmen:addresspos']) return -1;
        if (b[0].properties['carmen:addresspos'] < a[0].properties['carmen:addresspos']) return 1;

        // for address results, prefer those from point clusters
        if (a[0].properties['carmen:addressnumber'] && !b[0].properties['carmen:addressnumber']) return -1;
        if (b[0].properties['carmen:addressnumber'] && !a[0].properties['carmen:addressnumber']) return 1;
    }

    // omitted difference
    const omitted = ((a[0].geometry && a[0].geometry.omitted ? 1 : 0) - (b[0].geometry && b[0].geometry.omitted ? 1 : 0));
    if (omitted !== 0) return omitted;

    // sort by spatialmatch position ("stable sort")
    if (a[0].properties['carmen:position'] < b[0].properties['carmen:position']) return -1;
    if (a[0].properties['carmen:position'] > b[0].properties['carmen:position']) return 1;

    // last sort by id.
    if (a[0].id < b[0].id) return -1;
    if (a[0].id > b[0].id) return 1;
    return 0;
}

// Used for determining features with alike text for score promotion
// e.g. boosting New York (city) above New York (state)
//
// Given two properties objects with carmen:text* fields, compare each
// textfield and find likeness between target and candidate. If the text
// from the target is fully contained within the candidate text for a like
// language, the feature text is considered alike.
function textAlike(target, candidate) {
    const pattern = /^carmen:text/;
    const keys = Object.keys(target).filter(pattern.test.bind(pattern));
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (typeof target[key] !== 'string' || !target[key]) continue;
        if (typeof candidate[key] !== 'string' || !candidate[key]) continue;
        const targetText = target[key].split(',')[0];
        const candidateText = candidate[key].split(',')[0];
        if (candidateText.indexOf(targetText) !== -1) return true;
    }
    return false;
}
