var decode = require('./util/grid.js').decode;
var proximity = require('./util/proximity.js');

module.exports = spatialmatch;
module.exports.stackable = stackable;

function spatialmatch(query, phrasematches, options, callback) {
    var stacks = stackable(phrasematches);

    var relevMax = 0;
    var features = [];
    var sets = {};

    for (var i = 0; i < stacks.length; i++) {
        var stack = stacks[i];
        var l = 0;
        var m = 0;

        // Calculate the potential max relev score for any features
        // in this stack. Depending on existing relev scores, it may
        // not make sense to coalesce this stack.
        var potentialMax = 0;
        var maxZoom = 0;
        l = stack.length;
        while (l--) {
            potentialMax += stack[l].weight;
            maxZoom = Math.max(maxZoom, stack[l].zoom);
        }
        if (relevMax - potentialMax >= 0.25) continue;

        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        var coalesceOpts = {};
        if (options && options.proximity) {
            coalesceOpts.centerzxy = proximity.center2zxy(options.proximity[0], options.proximity[1], maxZoom);
        }

        // Coalesce stack, generate relevs.
        var result = coalesce(stack, coalesceOpts);
        relevMax = Math.max(relevMax, result.features[0].relev);

        // Include text for debugging with each matched feature.
        var byIdx = stackByIdx(stack);
        l = result.features.length;
        while (l--) {
            var feature = result.features[l];
            sets[feature.tmpid] = feature;
            m = feature.length;
            while (m--) {
                feature[m].mask = byIdx[feature[m].idx].mask;
                feature[m].text = byIdx[feature[m].idx].text;
            }
        }
        features = features.concat(result.features);
    }

    features.sort(sortByRelev);

    return callback(null, { results: features, sets: sets });
}

function stackByIdx(stack) {
    var byIdx = {};
    var l = stack.length;
    while (l--) byIdx[stack[l].idx] = {
        mask: stack[l].mask,
        text: stack[l].join(' ')
    };
    return byIdx;
}

// For a given set of phrasematch results across multiple indexes,
// provide all relevant stacking combinations using phrase masks to
// exclude colliding matches.
function stackable(phrasematches) {
    var idx = phrasematches.length;
    var stacks = [];

    while (idx--) {
        var matches = phrasematches[idx];
        var targetIdx = idx;
        var a = matches.length;
        while (a--) {
            var mask = matches[a].mask;
            var stack = [matches[a]];
            while (targetIdx && targetIdx--) {
                var target = phrasematches[targetIdx];
                var b = target.length;
                while (b--) {
                    if (mask & target[b].mask) continue;
                    mask = mask | target[b].mask;
                    stack.push(target[b]);
                    // Add one subquery at most per idx
                    break;
                }
            }
            stack.sort(sortByZoomIdx);
            stacks.push(stack);
        }
    }

    return stacks;
}

function sortByZoomIdx(a, b) {
    return (a.zoom - b.zoom) || (b.idx - a.idx);
}

// Combine the scores for each match across multiple grids and zoom levels,
// returning an object of `zxy` => feature mappings
var mp28 = Math.pow(2,28);
var mp14 = Math.pow(2,14);
var mp25 = Math.pow(2,25);
function coalesce(stack, options) {
    var done = {};
    var coalesced = {};
    var matched = [];
    var centerzxy = options.centerzxy;

    // Cache zoom levels to iterate over as coalesce occurs.
    var zoom = [];
    var zoomUniq = {};
    var zoomCache = {};
    for (var i = 0; i < stack.length; i++) {
        if (zoomUniq[stack[i].zoom]) continue;
        zoom.push(stack[i].zoom);
        zoomUniq[stack[i].zoom] = true;
    }

    for (var i = 0; i < zoom.length; i++) {
        zoomCache[zoom[i]] = zoom.slice(0,i-1);
        zoomCache[zoom[i]].reverse();
    }

    // Coalesce relevs into higher zooms, e.g.
    // z5 inherits relev of overlapping tiles at z4.
    // @TODO assumes sources are in zoom ascending order.
    for (var h = 0; h < stack.length; h++) {
        var matches = stack[h];
        var grids = matches.cache.get('grid', matches.phrase);
        var z = matches.zoom;
        for (var i = 0; i < grids.length; i++) {
            var grid = decode(grids[i]);
            grid.idx = matches.idx;
            grid.tmpid = grid.idx * mp25 + grid.id;
            grid.relev = grid.relev * matches.weight;
            var zxy = (z * mp28) + (grid.x * mp14) + grid.y;

            // proximity specified -- calculate a distance per grid
            // to the proximity location.
            if (centerzxy) {
                var proxzxy = proximity.pxy2zxy([z,grid.x,grid.y], centerzxy[0]);
                grid.distance = Math.sqrt(
                    Math.pow(proxzxy[1] - centerzxy[1], 2) +
                    Math.pow(proxzxy[2] - centerzxy[2], 2)
                );
            }

            if (!coalesced[zxy]) {
                var cover = [grid];
                cover.zxy = zxy;
                matched.push(cover);
                coalesced[zxy] = cover;
            } else {
                coalesced[zxy].push(grid);
            }

            if (!done[zxy]) for (var a = 0; a < zoomCache[z].length; a++) {
                p = zoomCache[z][a];
                s = 1 << (z-p);
                pxy = (p * mp28) + (Math.floor(grid.x/s) * mp14) + Math.floor(grid.y/s);
                // Set a flag to ensure coalesce occurs only once per zxy.
                if (coalesced[pxy]) {
                    coalesced[zxy].push.apply(coalesced[zxy], coalesced[pxy]);
                    done[zxy] = true;
                    break;
                }
            }
        }
    }

    var coalesced = [];
    var relevMax = 0;
    for (var h = 0; h < matched.length; h++) {
        var cover = matched[h];
        for (var i = 0; i < cover.length; i++) {
            var context = [];
            var lastidx = cover[i].idx;
            var stacky = 0;
            context.push(cover[i]);
            context.relev = cover[i].relev;
            for (var j = i+1; j < cover.length; j++) {
                if (cover[j].idx === lastidx) continue;
                stacky = 1;
                lastidx = cover[j].idx;
                context.push(cover[j]);
                context.relev += cover[j].relev;
            }
            context.relev -= 0.01;
            context.relev += 0.01 * stacky;
            coalesced.push(context);
        }
    }

    if (centerzxy) {
        coalesced.sort(sortByRelevDistance);
    } else {
        coalesced.sort(sortByRelev);
    }

    var features = [];
    var sets = {};
    var total = 0;

    if (coalesced.length) {
        // Coalesce stack, generate relevs.
        var relevMax = coalesced[0].relev;

        // Collect features within threshold of max relev.
        for (var i = 0; i < coalesced.length; i++) {
            // Maximum allowance of coalesced features: 40.
            if (total >= 40) break;

            var feature = coalesced[i];

            // Since `coalesced` is sorted by relev desc at first
            // threshold miss we can break the loop.
            if (relevMax - feature.relev >= 0.25) break;

            // Only collect each feature once.
            if (sets[feature[0].tmpid]) continue;

            sets[feature[0].tmpid] = feature;
            features.push(feature);
            total++;
        }
    }

    return { sets: sets, features: features };
}

function sortByRelev(a, b) {
    return (b.relev - a.relev) ||
        (b[0].score - a[0].score) ||
        (a[0].idx - b[0].idx);
}

function sortByRelevDistance(a, b) {
    return (b.relev - a.relev) ||
        (a.distance - b.distance) ||
        (b[0].score - a[0].score) ||
        (a[0].idx - b[0].idx);
}

