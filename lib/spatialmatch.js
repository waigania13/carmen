'use strict';
const proximity = require('./util/proximity.js');
const queue = require('d3-queue').queue;
const coalesce = require('@mapbox/carmen-cache').coalesce;
const bbox = require('./util/bbox.js');
const termops = require('./util/termops');
const constants = require('./constants');

module.exports = spatialmatch;
module.exports.stackable = stackable;
module.exports.rebalance = rebalance;
module.exports.allowed = allowed;
module.exports.sortByRelevLengthIdx = sortByRelevLengthIdx;
module.exports.sortByZoomIdx = sortByZoomIdx;

function spatialmatch(query, phrasematchResults, options, callback) {
    let stacks = phrasematchResults.length ? stackable(phrasematchResults) : [];
    stacks = allowed(stacks, options);
    stacks.forEach((stack) => { stack.sort(sortByZoomIdx); });
    stacks.sort(sortByRelevLengthIdx);
    stacks = stacks.slice(0,30);
    // Rebalance weights, relevs of stacks here.
    for (let i = 0; i < stacks.length; i++) {
        stacks[i] = rebalance(query, stacks[i]);
    }

    const waste = [];

    coalesceStacks();

    // coalesce all stacks.
    function coalesceStacks() {
        const q = queue();
        for (let i = 0; i < stacks.length; i++) q.defer(coalesceStack, stacks[i]);
        q.awaitAll(coalesceFinalize);
    }

    // Coalesce a single stack, add debugging info.
    function coalesceStack(stack, callback) {
        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        const coalesceOpts = {};
        if (options) {
            if (options.proximity) {
                let l = stack.length;
                let maxZoom = 0;
                while (l--) maxZoom = Math.max(maxZoom, stack[l].zoom);
                coalesceOpts.centerzxy = proximity.center2zxy(
                    options.proximity,
                    maxZoom
                );
                coalesceOpts.radius = constants.PROXIMITY_RADIUS;
            }

            if (options.bbox) {
                coalesceOpts.bboxzxy = bbox.insideTile(options.bbox, stack[0].zoom);
            }
        }

        coalesce(stack, coalesceOpts, (err, cacheSpatialmatches) => {
            // Include text for debugging with each matched feature.
            const byIdx = stackByIdx(stack);
            cacheSpatialmatches = cacheSpatialmatches || [];

            if (cacheSpatialmatches.length === 0) {
                waste.push(Object.keys(byIdx));
            }

            const spatialmatches = [];
            for (let i = 0; i < cacheSpatialmatches.length; i++) {
                spatialmatches.push(new Spatialmatch(cacheSpatialmatches[i], byIdx));
            }

            callback(null, spatialmatches);
        });
    }

    // Final feature collection and sort.
    function coalesceFinalize(err, results) {
        if (err) return callback(err);
        let combined = [];
        combined = combined.concat.apply(combined, results);
        combined.sort(sortByRelev);

        const sets = {};
        const doneAscending = {};
        const doneDescending = {};
        const doneSingle = {};
        const filteredSpatialmatches = [];
        for (let i = 0; i < combined.length; i++) {
            const spatialmatch = combined[i];
            const covers = spatialmatch.covers;
            for (let j = 0; j < covers.length; j++) {
                if (!sets[covers[j].tmpid] || sets[covers[j].tmpid].relev < covers[j].relev) sets[covers[j].tmpid] = covers[j];
            }
            // only allow one result in each direction
            if (covers.length > 1 && covers[0].idx > covers[1].idx && !doneDescending[covers[0].tmpid]) {
                doneDescending[covers[0].tmpid] = true;
                filteredSpatialmatches.push(spatialmatch);
            } else if (covers.length > 1 && covers[0].idx < covers[1].idx && !doneAscending[covers[0].tmpid]) {
                doneAscending[covers[0].tmpid] = true;
                filteredSpatialmatches.push(spatialmatch);
            } else if (covers.length === 1 && !doneAscending[covers[0].tmpid] && !doneDescending[covers[0].tmpid] && !doneSingle[covers[0].tmpid]) {
                doneSingle[covers[0].tmpid] = true;
                filteredSpatialmatches.push(spatialmatch);
            }
        }

        return callback(null, { results: filteredSpatialmatches, sets: sets, waste: waste });
    }
}

// Filter an array of stacks down to only those whose maxidx is allowed
// by a passed in allowed_idx filter.
function allowed(stacks, options) {
    if (!options.allowed_idx) return stacks;
    const filtered = [];
    for (let i = 0; i < stacks.length; i++) {
        let stack_maxidx = 0;
        for (let j = 0; j < stacks[i].length; j++) {
            stack_maxidx = Math.max(stack_maxidx, stacks[i][j].idx);
        }
        if (options.allowed_idx[stack_maxidx]) {
            filtered.push(stacks[i]);
        }
    }
    return filtered;
}

function stackByIdx(stack) {
    const byIdx = {};
    let l = stack.length;
    while (l--) byIdx[stack[l].idx] = stack[l];
    return byIdx;
}

// For a given set of phrasematch results across multiple indexes,
// provide all relevant stacking combinations using phrase masks to
// exclude colliding matches.
function stackable(phrasematchResults, memo, idx, mask, nmask, stack, relev) {
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
    if (phrasematchResults[idx + 1] !== undefined) {
        stackable(phrasematchResults, memo, idx + 1, mask, nmask, stack, relev);
    }

    const phrasematchResult = phrasematchResults[idx];

    // For each stacked item check the next bmask for its idx.
    // If the bmask includes the idx these indexes cannot stack
    // (their geocoder_stack do not intersect at all).
    const bmask = phrasematchResult.bmask;
    for (let j = 0; j < stack.length; j++) {
        if (bmask[stack[j].idx]) return;
    }

    // Though spatialmatches are sliced to 30 elements after this step
    // leave some headroom as this step does not include type filtering.
    const limit = 100;

    // Recurse, including this level
    const phrasematches = phrasematchResult.phrasematches;
    for (let i = 0; i < phrasematches.length; i++) {
        const next = phrasematches[i];
        if (mask & next.mask) continue;
        if (nmask & phrasematchResult.nmask) continue;

        // compare index order to input order to determine direction
        if (stack.length &&
            stack[0].idx >= next.idx &&
            mask &&
            mask < next.mask) continue;

        const targetStack = stack.slice(0);
        const targetMask = mask | next.mask;
        const targetNmask = nmask | phrasematchResult.nmask;
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
                    memo.maxStacks = [targetStack];
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
        if (phrasematchResults[idx + 1] !== undefined) {
            stackable(phrasematchResults, memo, idx + 1, targetMask, targetNmask, targetStack, targetStack.relev);
        }
    }

    if (idx === 0) {
        const stacks = memo.stacks.concat(memo.maxStacks);
        return stacks;
    }
}

function sortByRelevLengthIdx(a, b) {
    const first = (b.relev - a.relev) ||
        (a.length - b.length) ||
        (b[b.length - 1].scorefactor - a[a.length - 1].scorefactor);
    if (first) return first;

    for (let end = a.length - 1; end >= 0; end--) {
        const second = a[end].idx - b[end].idx;
        if (second) return second;
    }
}

function sortByZoomIdx(a, b) {
    return (a.zoom - b.zoom) || (a.idx - b.idx) || (b.mask - a.mask);
}

function sortByRelev(a, b) {
    return (b.relev - a.relev) ||
        (b.covers[0].scoredist - a.covers[0].scoredist) ||
        (a.covers[0].idx - b.covers[0].idx);
}

function rebalance(query, stack) {
    let stackMask = 0;
    const stackClone = [];

    for (let i = 0; i < stack.length; i++) {
        stackMask |= stack[i].mask;
    }

    const garbage = (query.length === (stackMask.toString(2).split(1).length - 1)) ? 0 : 1;
    const weight = 1 / (garbage + stack.length);

    // recompute total relevance from scratch
    stackClone.relev = weight * stack.length;

    // shallow copy stack into stackClone to prevent cases where a stack's
    // index gets overwritten in deep copies.
    for (let k = 0; k < stack.length; k++) {
        stackClone[k] = stack[k].clone();
        stackClone[k].weight = weight;
    }

    return stackClone;
}

function Spatialmatch(cacheSpatialmatch, stackByIdx) {
    this.relev = cacheSpatialmatch.relev;
    this.covers = [];
    for (let i = 0; i < cacheSpatialmatch.length; i++) {
        const cacheCover = cacheSpatialmatch[i];
        this.covers.push(new Cover(cacheCover, stackByIdx[cacheCover.idx]));
    }
}

function Cover(cacheCover, phrasematch) {
    this.x = cacheCover.x;
    this.y = cacheCover.y;
    this.relev = cacheCover.relev;
    this.id = cacheCover.id;
    this.idx = cacheCover.idx;
    this.tmpid = cacheCover.tmpid;
    this.distance = cacheCover.distance;
    this.score = termops.decode3BitLogScale(cacheCover.score, phrasematch.scorefactor);
    this.scoredist = cacheCover.scoredist > 7 ? (phrasematch.scorefactor / 7) * cacheCover.scoredist : termops.decode3BitLogScale(cacheCover.scoredist, phrasematch.scorefactor);
    this.scorefactor = phrasematch.scorefactor;
    this.matches_language = cacheCover.matches_language;
    this.prefix = phrasematch.prefix;

    this.mask = phrasematch.mask;
    this.text = phrasematch.subquery.join(' ');
    this.zoom = phrasematch.zoom;
}
