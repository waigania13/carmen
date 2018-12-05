'use strict';
const termops = require('../text-processing/termops');
const token = require('../text-processing/token');
const bb = require('../util/bbox');
const cl = require('../text-processing/closest-lang');
const filter = require('./filter-sources');
const MIN_CORRECTION_LENGTH = require('../constants').MIN_CORRECTION_LENGTH;

// TODO: unit test for phrasematch

/**
* phrasematch
* @access public
*
* @param {Object} source a Geocoder datasource
* @param {Array} a list of terms composing the query to Carmen
* @param {Object} options passed through the geocode function in geocode.js
* @param {Function} callback called with `(err, phrasematches, source)`
*/
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = !!(options.autocomplete || false);
    options.bbox = options.bbox || false;
    options.fuzzyMatch = options.fuzzyMatch === undefined ? true : !!options.fuzzyMatch;

    // if requested country isn't included, skip
    if (options.stacks) {
        const stackAllowed = filter.sourceMatchesStacks(source, options);
        if (!stackAllowed) return callback(null, new PhrasematchResult([], source));
    }

    // if not in bbox, skip
    if (options.bbox) {
        const intersects = bb.intersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, new PhrasematchResult([], source));
    }

    const phraseSet = source._dictcache.reader;

    const replaced = token.replaceToken(source.token_replacer, query);
    const tokenized = termops.tokenize(
        termops.encodableText(replaced.query)
    );
    const maxDistance = (options.fuzzyMatch && tokenized.length <= options.max_correction_length) ? 1 : 0;

    let subqueries;
    if (!source.geocoder_address) {
        // this is the common case, in which the permutations we're exploring
        // are just all the substrings of the query; in this case, we can trust
        // fuzzy-phrase to explore the windows of our query for us
        const windowMatches = phraseSet.fuzzyMatchWindows(tokenized, maxDistance, maxDistance, options.autocomplete);

        subqueries = [];
        for (const match of windowMatches) {
            const subquery = match.phrase;
            subquery.original_phrase = tokenized.slice(
                match.start_position,
                match.start_position + match.phrase.length
            );

            // for phrases comprised of a single very short word, don't accept corrections
            if (match.edit_distance > 0 && match.phrase.length === 1) {
                if (
                    match.phrase[0].length < MIN_CORRECTION_LENGTH ||
                    subquery.original_phrase[0].length < MIN_CORRECTION_LENGTH
                ) {
                    continue;
                }
            }
            subquery.ender = match.ends_in_prefix;

            let mask = 0;
            for (let i = 0; i < match.phrase.length; i++) {
                mask = mask | (1 << (match.start_position + i));
            }
            subquery.mask = mask;
            subquery.edit_distance = match.edit_distance;
            subqueries.push(subquery);
        }
        subqueries.sort((a, b) => b.length - a.length);
    } else {
        // addresses are special and need to do weird rearrangements of tokens,
        // so we'll do this on the JS side

        subqueries = [];

        // Get all subquery permutations from the query
        let allSubqueries = termops.permutations(tokenized);
        allSubqueries = termops.uniqPermutations(allSubqueries);

        // Include housenum tokenized permutations
        const numTokenized = termops.numTokenize(tokenized, source.version);
        for (let i = 0; i < numTokenized.length; i++) {
            allSubqueries = allSubqueries.concat(termops.permutations(numTokenized[i]));
        }

        const toMatch = allSubqueries
            .filter((subquery) => subquery)
            .map((subquery) => [subquery, subquery.ender && options.autocomplete]);
        const results = phraseSet.fuzzyMatchMulti(toMatch, maxDistance, maxDistance);
        let l = toMatch.length;
        while (l--) {
            const subquery = toMatch[l][0];
            const scanPrefix = toMatch[l][1];

            const phraseSetMatches = results[l];

            for (let i = 0; i < phraseSetMatches.length; i++) {
                const sq = phraseSetMatches[i].phrase;
                sq.original_phrase = subquery;
                sq.ender = scanPrefix;
                sq.mask = subquery.mask;
                sq.edit_distance = phraseSetMatches[i].edit_distance;

                // for phrases comprised of a single very short word, don't accept corrections
                if (sq.edit_distance > 0 && sq.length === 1) {
                    if (
                        sq[0].length < MIN_CORRECTION_LENGTH ||
                        sq.original_phrase[0].length < MIN_CORRECTION_LENGTH
                    ) {
                        continue;
                    }
                }

                subqueries.push(sq);
            }
        }
    }

    let languages;
    if (options.language) {
        languages = [options.language[0]];
    } else {
        // this may not be what we want to do here
        // if effectively treats 'default' as its own language, and a lack of
        // specified language flag as a search over this language
        // we could alternatively search all languages here by setting this field
        // to undefined, or emply some other strategy
        languages = ['default'];
    }
    languages = languages.map((l) => {
        // use the built-in language if we have it
        if (source.lang.lang_map.hasOwnProperty(l)) {
            return source.lang.lang_map[l];
        } else {
            const label = cl.closestLangLabel(l, source.lang.lang_map);
            return source.lang.lang_map[label || 'unmatched'];
        }
    });

    // load up scorefactor used at indexing time.
    // it will be used to scale scores for approximated
    // cross-index comparisons.
    const scorefactor = (source._geocoder.freq.get('__MAX__') || [0])[0] || 1;

    const proxMatch = options.proximity ?
        bb.inside(options.proximity, source.bounds) :
        false;

    const phrasematches = [];

    for (const subquery of subqueries) {
        const phrase = subquery.join(' ');
        // Augment permutations with matched grids,
        // index position and weight relative to input query.
        // use the original subquery to calculate weight, in case the variant has a different cardinality
        const weight = subquery.length / tokenized.length;
        let editMultiplier = 1;
        if (subquery.edit_distance !== 0) {
            // approximate a levenshtein ratio -- this is usually defined as
            // ratio(a, b) = ((len(a) + len(b)) - distance(a, b)) / (len(a) + len(b))
            // except in this instance we're just going to base it on the query text,
            // so that different matches that are the same distance from the query
            // text can be disambiguated by score even if they have different lengths
            const original = subquery.original_phrase.join(' ');
            editMultiplier = Math.max(
                (original.length - (subquery.edit_distance / 2)) / original.length,
                .75
            );
        }

        // If the query matches an index with geocoder_categories set
        // and the query is one of the listed categories, give this
        // possible result a small bump
        if (source.categories) {
            if (source.categories.has(phrase)) {
                editMultiplier *= 1.01;
            }
        }
        // Set prefix to one of three values:
        // 0 = no autocomplete
        // 1 = autocomplete, match anything
        // 2 = autocomplete at a word boundary
        let prefix = 0;
        if (subquery.ender && !(source.geocoder_address && termops.isAddressNumber(subquery))) {
            if (replaced.lastWord) prefix = 2;
            else prefix = 1;
        }
        phrasematches.push(new Phrasematch(subquery, weight, subquery.mask, phrase, scorefactor, source.idx, source._geocoder.grid, source.zoom, prefix, languages, editMultiplier, proxMatch));
    }

    return callback(null, new PhrasematchResult(phrasematches, source));
};

/**
* PhrasematchResult
* @param {Object} phrasematches for the subquery combinations generated from the phrasematch function
* @param {Object} source a Geocoder datasource
**/
module.exports.PhrasematchResult = PhrasematchResult;
function PhrasematchResult(phrasematches, source) {
    this.phrasematches = phrasematches;
    this.idx = source.idx;
    this.nmask = 1 << source.ndx;
    this.bmask = source.bmask;
}

/**
* Phrasematch Object constructor
* Attributes used by carmen-cache, all phrasematches from the same source have the same values for idx, cache, zoom
**/
module.exports.Phrasematch = Phrasematch;
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom, prefix, languages, editMultiplier, proxMatch) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.scorefactor = scorefactor;
    this.prefix = prefix;
    this.languages = languages;
    this.idx = idx;
    this.cache = cache;
    this.zoom = zoom;
    this.editMultiplier = editMultiplier || 1;
    this.proxMatch = proxMatch || false;
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom, this.prefix, this.languages, this.editMultiplier, this.proxMatch);
};
