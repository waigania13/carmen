var proximity = require('./util/proximity.js');
var queue = require('d3-queue').queue;
var coalesce = require('carmen-cache').Cache.coalesce;
var uniq = require('./util/uniq');
var bbox = require('./util/bbox.js');

module.exports = spatialmatch;
module.exports.stackable = stackable;
module.exports.rebalance = rebalance;

function spatialmatch(query, phrasematches, options, callback) {
    var stacks = phrasematches.length ? stackable(phrasematches) : [];
    stacks = allowed(stacks, options);
    stacks = stacks.slice(0,30);
    // Rebalance weights, relevs of stacks here.
    for (var i = 0; i < stacks.length; i++) {
        stacks[i] = rebalance(query, stacks[i]);
    }

    var waste = [];

    coalesceLoad();

    // Load grid indexes necessary for coalesce.
    function coalesceLoad() {
        // First make a pass where phrase IDs to load are grouped by idx.
        var loadables = {};
        var idx;
        for (var i = 0; i < stacks.length; i++) {
            var stack = stacks[i];
            for (var j = 0; j < stack.length; j++) {
                idx = stack[j].idx;
                loadables[idx] = loadables[idx] || {
                    loadall: stack[j].loadall,
                    getter: stack[j].getter,
                    ids: []
                };
                loadables[idx].ids.push(stack[j].phrase);
            }
        }

        // Then queue loading in a single pass deduping ids.
        var q = queue();
        for (idx in loadables) {
            q.defer(loadables[idx].loadall, loadables[idx].getter, 'grid', uniq(loadables[idx].ids));
        }
        q.awaitAll(coalesceStacks);
    }

    // Shards are loaded, now coalesce all stacks.
    function coalesceStacks(err) {
        if (err) return callback(err);
        var q = queue();
        for (var i = 0; i < stacks.length; i++) q.defer(coalesceStack, stacks[i]);
        q.awaitAll(coalesceFinalize);
    }

    // Coalesce a single stack, add debugging info.
    function coalesceStack(stack, callback) {
        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        var coalesceOpts = {};
        if (options && options.proximity) {
            var l = stack.length;
            var maxZoom = 0;
            while (l--) maxZoom = Math.max(maxZoom, stack[l].zoom);
            coalesceOpts.centerzxy = proximity.center2zxy(
                options.proximity,
                maxZoom
            );
        }

        if (options && options.bbox) {
            coalesceOpts.bboxzxy = bbox.insideTile(options.bbox, stack[0].zoom);
        }

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
                    feature[m].score = feature[m].score * byIdx[feature[m].idx].scorefactor;
                    feature[m].scorefactor = byIdx[feature[m].idx].scorefactor;
                    feature[m].scoredist = feature[m].scoredist * byIdx[feature[m].idx].scorefactor;
                }
            }

            if (features.length == 0) {
                waste.push(Object.keys(byIdx));
            }

            callback(null, features);
        });
    }

    // Final feature collection and sort.
    function coalesceFinalize(err, results) {
        if (err) return callback(err);
        var combined = [];
        combined = combined.concat.apply(combined, results);
        combined.sort(sortByRelev);

        var sets = {};
        var doneAscending = {};
        var doneDescending = {};
        var doneSingle = {};
        var features = [];
        for (var i = 0; i < combined.length; i++) {
            var feature = combined[i];
            for (var j = 0; j < feature.length; j++) {
                sets[feature[j].tmpid] = feature[j];
            }
            // only allow one result in each direction
            if (feature.length > 1 && feature[0].idx > feature[1].idx && !doneDescending[feature[0].tmpid]) {
                doneDescending[feature[0].tmpid] = true;
                features.push(feature);
            } else if (feature.length > 1 && feature[0].idx < feature[1].idx && !doneAscending[feature[0].tmpid]) {
                doneAscending[feature[0].tmpid] = true;
                features.push(feature);
            } else if (feature.length === 1 && !doneAscending[feature[0].tmpid] && !doneDescending[feature[0].tmpid] && !doneSingle[feature[0].tmpid]) {
                doneSingle[feature[0].tmpid] = true;
                features.push(feature);
            }
        }

        return callback(null, { results: features, sets: sets, waste: waste });
    }
}

// Filter an array of stacks down to only those whose maxidx is allowed
// by a passed in allowed_idx filter.
function allowed(stacks, options) {
    if (!options.allowed_idx) return stacks;
    var filtered = [];
    for (var i = 0; i < stacks.length; i++) {
        var stack_maxidx = 0;
        for (var j = 0; j < stacks[i].length; j++) {
            stack_maxidx = Math.max(stack_maxidx, stacks[i][j].idx);
        }
        if (options.allowed_idx[stack_maxidx]) {
            filtered.push(stacks[i]);
        }
    }
    return filtered;
}

function stackByIdx(stack) {
    var byIdx = {};
    var l = stack.length;
    while (l--) byIdx[stack[l].idx] = {
        scorefactor: stack[l].scorefactor,
        mask: stack[l].mask,
        text: stack[l].join(' ')
    };
    return byIdx;
}

// For a given set of phrasematch results across multiple indexes,
// provide all relevant stacking combinations using phrase masks to
// exclude colliding matches.
function stackable(phrasematches, memo, idx, mask, nmask, stack, relev) {
    if (memo === undefined) {
        memo = {
            stacks: [],
            maxStacks: [],
            maxRelev: 0
        };
        idx = 0;
        mask = 0;
        nmask = 0;
        stack = [];
        relev = 0;
    }

    // Recurse, skipping this level
    if (phrasematches[idx+1] !== undefined) {
        stackable(phrasematches, memo, idx+1, mask, nmask, stack, relev);
    }

    // For each stacked item check the next bmask for its idx.
    // If the bmask includes the idx these indexes cannot stack
    // (their geocoder_stack do not intersect at all).
    var bmask = phrasematches[idx].length && phrasematches[idx][0].bmask;
    if (bmask) for (var j = 0; j < stack.length; j++) {
        if (bmask[stack[j].idx]) return;
    }

    // Though spatialmatches are sliced to 30 elements after this step
    // leave some headroom as this step does not include type filtering.
    var limit = 100;

    // Recurse, including this level
    for (var i = 0; i < phrasematches[idx].length; i++) {
        var next = phrasematches[idx][i];
        if (mask & next.mask) continue;
        if (nmask & next.nmask) continue;

        // compare index order to input order to determine direction
        if (stack.length &&
            stack[0].idx >= next.idx &&
            mask &&
            mask < next.mask) continue;

        var targetStack = stack.slice(0);
        var targetMask = mask | next.mask
        var targetNmask = nmask | next.nmask;
        targetStack.relev = relev + next.weight;

        // ensure order of targetStack maintains lowest mask value at the
        // first position. ensure direction check above works.
        if (next.mask < mask) {
            targetStack.unshift(next);
        } else {
            targetStack.push(next);
        }

        if (targetStack.relev > 0.5) {
            if (targetStack.relev > memo.maxRelev) {
                if (memo.maxStacks.length >= limit) {
                    memo.stacks = memo.maxStacks;
                    memo.maxStacks = [ targetStack ];
                } else {
                    memo.maxStacks.push(targetStack);
                }
                memo.maxRelev = targetStack.relev;
            } else if (targetStack.relev === memo.maxRelev) {
                memo.maxStacks.push(targetStack);
            } else if (memo.maxStacks.length < limit) {
                memo.stacks.push(targetStack);
            }
        }

        // Recurse to next level
        if (phrasematches[idx+1] !== undefined) {
            stackable(phrasematches, memo, idx+1, targetMask, targetNmask, targetStack, targetStack.relev);
        }
    }

    if (idx === 0) {
        var stacks;
        stacks = memo.stacks.concat(memo.maxStacks);
        stacks.forEach(function(stack) { stack.sort(sortByZoomIdx); });
        stacks.sort(sortByRelevLengthIdx);
        return stacks.slice(0, limit);
    }
}

function sortByRelevLengthIdx(a, b) {
    var first = (b.relev - a.relev) ||
        (a.length - b.length) ||
        (b[b.length-1].scorefactor - a[a.length-1].scorefactor);
    if (first) return first;

    for (var end = a.length - 1; end >= 0; end--) {
        var second = a[end].idx - b[end].idx;
        if (second) return second;
    }
}

function sortByZoomIdx(a, b) {
    return (a.zoom - b.zoom) || (b.idx - a.idx) || (b.mask - a.mask);
}

function sortByRelev(a, b) {
    return (b.relev - a.relev) ||
        (b[0].scoredist - a[0].scoredist) ||
        (a[0].idx - b[0].idx);
}

function rebalance(query, stack) {
    var stackMask = 0;
    var stackClone = [];

    //shallow copy stack into stackClone to prevent cases where a stack's
    //index gets overwritten in deep copies.
    for (var m = 0; m < stack.length; m++) {
        stackClone[m] = stack[m].slice();
        for (var key in stack[m]) {
            stackClone[m][key] = stack[m][key];
        }
    }

    for (var i = 0; i < stackClone.length; i++) {
        stackMask |= stackClone[i].mask;
    }

    var garbage = (query.length === (stackMask.toString(2).split(1).length -1)) ? 0 : 1;
    var weight = 1/(garbage + stackClone.length);

    //recompute total relevance from scratch
    stackClone.relev = 0;

    for (var k = 0; k < stackClone.length; k++) {
        stackClone[k].weight = weight;
        stackClone.relev += stackClone[k].weight;
    }

    return stackClone;
}
