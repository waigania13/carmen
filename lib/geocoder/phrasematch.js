'use strict';
const termops = require('../text-processing/termops');
const token = require('../text-processing/token');
const bb = require('../util/bbox');
const cl = require('../text-processing/closest-lang');
const filter = require('./filter-sources');

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
    const maxDistance = options.fuzzyMatch ? 1 : 0;

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

    const tokenized = termops.tokenize(
        termops.encodableText(token.replaceToken(source.token_replacer, query))
    );

    let subqueries;
    if (!source.geocoder_address) {
        // this is the common case, in which the permutations we're exploring
        // are just all the substrings of the query; in this case, we can trust
        // fuzzy-phrase to explore the windows of our query for us
        const windowMatches = phraseSet.fuzzyMatchWindows(tokenized, maxDistance, maxDistance, options.autocomplete);
        subqueries = windowMatches.map((match) => {
            const subquery = match.phrase;
            subquery.ender = match.ends_in_prefix;

            let mask = 0;
            for (let i = 0; i < match.phrase.length; i++) {
                mask = mask | (1 << (match.start_position + i));
            }
            subquery.mask = mask;
            subquery.edit_distance = match.edit_distance;
            return subquery;
        });
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
                sq.ender = scanPrefix;
                sq.mask = subquery.mask;
                sq.edit_distance = phraseSetMatches[i].edit_distance;
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

    const phrasematches = [];

    for (const subquery of subqueries) {
        // Augment permutations with matched grids,
        // index position and weight relative to input query.
        // use the original subquery to calculate weight, in case the variant has a different cardinality
        const weight = subquery.length / tokenized.length;

        const prefix = (subquery.ender && !(source.geocoder_address && termops.isAddressNumber(subquery)));

        // TODO: need to add data to Phrasematch to be used in
        // relevance rankings. could be edit distance, or maybe the
        // distance adjusted by overall length of query <27-06-18, boblannon> //
        phrasematches.push(new Phrasematch(subquery, weight, subquery.mask, subquery.join(' '), scorefactor, source.idx, source._geocoder.grid, source.zoom, prefix, languages));
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
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom, prefix, languages) {
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
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom, this.prefix, this.languages);
};
