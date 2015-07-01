var decode = require('./util/grid.js').decode;
var proximity = require('./util/proximity.js');
var queue = require('queue-async');
var coalesce = require('carmen-cache').Cache.coalesce;

module.exports = spatialmatch;
module.exports.stackable = stackable;

function spatialmatch(query, phrasematches, options, callback) {
    var stacks = stackable(phrasematches);

    var relevMax = 0;
    var features = [];
    var sets = {};

    var q = queue();

    for (var i = 0; i < stacks.length; i++) {
        var stack = stacks[i];
        var l = 0;
        var m = 0;

        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        var coalesceOpts = {};
        if (options && options.proximity) {
            l = stack.length;
            var maxZoom = 0;
            while (l--) maxZoom = Math.max(maxZoom, stack[l].zoom);
            coalesceOpts.centerzxy = proximity.center2zxy(
                options.proximity[0],
                options.proximity[1],
                maxZoom
            );
        }

        q.defer(coalesceStack, stack, coalesceOpts);
    }

    q.awaitAll(coalesceFinalize);

    // Coalesce stack, add debugging info.
    function coalesceStack(stack, coalesceOpts, callback) {
        coalesce(stack, coalesceOpts, function(err, features) {
            // Include text for debugging with each matched feature.
            var byIdx = stackByIdx(stack);
            var l = features.length;
            while (l--) {
                var feature = features[l];
                var m = feature.length;
                while (m--) {
                    feature[m].mask = byIdx[feature[m].idx].mask;
                    feature[m].text = byIdx[feature[m].idx].text;
                }
            }
            callback(null, features);
        });
    }

    // Final feature collection and sort.
    function coalesceFinalize(err, results) {
        if (err) return callback(err);

        var combined = [];
        combined = combined.concat.apply(combined, results);
        if (options.proximity) {
            combined.sort(sortByRelevDistance);
        } else {
            combined.sort(sortByRelev);
        }

        var sets = {};
        var features = [];
        for (var i = 0; i < combined.length; i++) {
            var feature = combined[i];
            if (sets[feature[0].tmpid]) continue;
            sets[feature[0].tmpid] = feature;
            features.push(feature);
        }

        return callback(null, { results: features, sets: sets });
    }
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
            var potentialRelev = matches[a].weight;
            var mask = matches[a].mask;
            var stack = [matches[a]];
            while (targetIdx && targetIdx--) {
                var target = phrasematches[targetIdx];
                var b = target.length;
                while (b--) {
                    if (mask & target[b].mask) continue;
                    mask = mask | target[b].mask;
                    potentialRelev += target[b].weight;
                    stack.push(target[b]);
                    // Add one subquery at most per idx
                    break;
                }
            }

            // Exclude any stacks that would not exceed
            // a relev of 0.5 even if they were perfectly
            // matched during spatialmatch.
            if (potentialRelev < 0.5) continue;

            stack.sort(sortByZoomIdx);
            stacks.push(stack);
        }
    }

    return stacks;
}

function sortByZoomIdx(a, b) {
    return (a.zoom - b.zoom) || (b.idx - a.idx);
}

function sortByRelev(a, b) {
    return (b.relev - a.relev) ||
        (b[0].score - a[0].score) ||
        (a[0].idx - b[0].idx);
}

function sortByRelevDistance(a, b) {
    return (b.relev - a.relev) ||
        (a[0].distance - b[0].distance) ||
        (b[0].score - a[0].score) ||
        (a[0].idx - b[0].idx);
}

