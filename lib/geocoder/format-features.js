'use strict';
const Handlebars = require('handlebars');
const closestLang = require('../text-processing/closest-lang');
const featureMatchesLanguage = require('./filter-sources').featureMatchesLanguage;
const termops = require('../text-processing/termops');
const bbox = require('../util/bbox');
const filter = require('./filter-sources');
const leven = require('leven');

module.exports.toFeature = toFeature;
module.exports.toFeatures = toFeatures;

/**
 * getFormatString - get a `place_name` template string from a format object
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Object of format strings by language
 * @param {String} language code
 * @return {String} templating string for formatting place_name output
 */
function getFormatString(context, format, language) {
    // check for whether or not there are any parts of the response in the queried language.
    // if not, use the default templating rather than the one appropriate to the queried language.
    const languageFormat = language ? closestLang(language, format, '') : false;
    if (languageFormat) {
        for (let k = 0; k < context.length; k++) {
            const languageText = language ? closestLang(language, context[k].properties, 'carmen:text_') : false;
            if (languageText ||
                context[k].properties.language === language) {
                format = languageFormat;
                break;
            }
        }
    }
    return typeof format === 'object' ? format['default'] : format;
}

/**
 * getPlaceName - get a formatted `place_name` string for a given context stack & language
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {String} formatString Templating string for formatting place_name output
 * @param {String} language code to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter results strictly to a specific language. Undefined defaults null.
 * @param {Boolean} matched If set, use matched text in place name
 * @param {Carmen} geocoder A carmen object used to generate the results
 * @return {String} formatted place_name string
 */
function getPlaceName(context, formatString, language, languageMode, matched, source) {
    const feat = context[0];

    if (Object.keys(feat.properties).filter((k) => k.match(/^carmen:format/)).length) {
        const templateLang = language ? closestLang.closestLangLabel(language, feat.properties, 'carmen:format_') : undefined;
        const template = templateLang ? feat.properties['carmen:format_' + templateLang] : feat.properties['carmen:format'];
        if (template) {
            try {
                formatString = Handlebars.compile(template, { noEscape: true });
            } catch (err) {
                console.error('incorrect geocoder_format' + err);
            }
        }
    }

    let place_name;
    // Use geocoder_format to format output if applicable
    if (!formatString || formatString === true || formatString === 1) {
        let prefix;
        if (feat.properties['carmen:address']) prefix = feat.properties['carmen:address'] + ' ';
        else prefix = '';
        place_name = (
            prefix +
            context
                .filter((f) => { return matched || featureMatchesLanguage(f, { language: [language], languageMode: languageMode }); })
                .map((f) => { return (matched ? f.matching_text : undefined) || closestLang.getText(language, f.properties).text; })
                .join(', ')
        ).trim();
    } else {
        let val, num = '';
        const renderObj = {};
        for (let i = 0; i < context.length; i++) {
            const f = context[i];
            if (!f.properties['carmen:text']) throw new Error('Feature has no carmen:text');
            if (!featureMatchesLanguage(f, { language: [language], languageMode: languageMode })) continue;
            const carmenProp = f.properties['carmen:extid'].split('.', 1)[0]; // ex. 'place', 'postcode', 'region'

            if (f.properties['carmen:intersection']) {
                const intersectionPrefix = f.properties['carmen:intersection'] + ' ' + source.geocoder_intersection_token + ' ';
                const intersectionSuffix = getIntersectionStreetName(source, f.properties);
                val = intersectionPrefix + intersectionSuffix;
            }
            else if (matched && f.matching_text) val = f.matching_text;
            else val = closestLang.getText(language, f.properties).text;

            num = f.properties['carmen:address'];
            if (num && typeof(num) == 'number') {
                num += '';
            }
            num = (num || '').split(',')[0];

            renderObj[carmenProp] = {
                properties: f.properties,
                name: val,
                number: num
            };
        }
        // Handle any cases where context wasn't available by getting rid of curly braces, awkwards spaces/commas
        place_name = formatString(renderObj, { helpers: source ? source.format_helpers : {} }).replace(/\{.+?\}/g, '').replace(/, \s*$/, '').replace(/ , /g,', ').replace(/ {2}/g,' ').replace(/, -/,',').replace(/, ,/g,'').replace(/^,/,'').replace(/,,/,',').trim().replace(/,$/,'');
    }

    return place_name;
}

/**
 * toFeature - Reformat a context array into a Carmen GeoJSON feature
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Objects containing default/langauge specific formatting for `place_name`.
 * @param {Array<string>} languages - codes to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter resutlts strictly to a specific language. Undefined defaults null.
 * @param {Boolean} debug Enable debug mode to expose internal properties in results
 * @param {Object} geocoder Geocoder object
 * @param {boolean} clipBBox Whether or not to clip BBox
 * @param {boolean} routing Whether or not geocoding request was made for routing
 * @return {Object} Carmen GeoJSON feature
 */
function toFeature(context, format, languages, languageMode, debug, geocoder, clipBBox, routing) {
    const feat = context[0];
    if (!feat.properties['carmen:center']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

    languages = languages && languages.length ? languages : [''];

    const feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        place_type: feat.properties['carmen:types'],
        relevance: context._relevance,
        properties: {}
    };
    if (feat.matching_text) feature.matching_text = feat.matching_text;
    if (feat.matching_language) feature.matching_language = feat.matching_language;
    if (routing && feat.routable_points) feature.routable_points = feat.routable_points;

    const source = geocoder ? geocoder.byidx[feat.properties['carmen:idx']] : {};

    languages.reduce((memo, language, i) => {
        const suffix = language ? `_${language}` : '';
        const text = closestLang.getText(language, feat.properties);
        const formatString = getFormatString(context, format, language);

        memo[`text${suffix}`] = text.text;
        if (text.language) memo[`language${suffix}`] = text.language.replace('_', '-');
        memo[`place_name${suffix}`] = getPlaceName(context, formatString, language, languageMode, false, source);
        if (i === 0) {
            memo.text = memo[`text${suffix}`];
            if (text.language) memo.language = memo[`language${suffix}`];
            memo.place_name = memo[`place_name${suffix}`];

            // Get matching place name if no language matching occurred.
            if (geocoder) {
                for (let k = 0; k < context.length; k++) {
                    const matched = !!context[k].properties['carmen:query_text'] && getMatchingText(context[k], geocoder, language);
                    if (matched) {
                        context[k].matching_text = matched.matching_text;
                        context[k].matching_language = matched.matching_language;
                        if (k === 0) feature.matching_text = matched.matching_text;
                        feature.matching_place_name = getPlaceName(context, formatString, language, languageMode, !!matched, source);
                    }
                }
            }
        }
        return memo;
    }, feature);

    // optionally clip [W,S,E,N] bbox at runtime so that it does not cross the anti-meridian
    if (feat.bbox) feature.bbox = clipBBox ? bbox.clipBBox(feat.bbox) : feat.bbox;

    if (feat.properties['carmen:center']) {
        feature.center = feat.geometry && feat.geometry.type === 'Point' ?
            feat.geometry.coordinates :
            feat.properties['carmen:center'];
        feature.geometry = feat.geometry || {
            type: 'Point',
            coordinates: feat.properties['carmen:center']
        };
    // This case is meant *only* for legacy carmen sources which supported
    // features without geometries.
    } else {
        feature.geometry = null;
    }

    if (feat.properties['carmen:address']) feature.address = String(feat.properties['carmen:address']);

    for (const key in context[0].properties) if (key.indexOf('carmen:') !== 0 || debug) {
        if (key === 'id') continue;
        feature.properties[key] = context[0].properties[key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (let c = 1; c < context.length; c++) {
            if (!context[c].properties['carmen:extid']) throw new Error('Feature has no carmen:extid');
            if (!featureMatchesLanguage(context[c], { language: languages, languageMode: languageMode })) continue;

            const contextFeat = { id: context[c].properties['carmen:extid'] };

            // copy over all non-'carmen:*' properties
            const propertyKeys = Object.keys(context[c].properties).filter((prop) => {
                return !/^carmen:/.test(prop) && !/^id$/.test(prop);
            });

            for (let j = 0; j < propertyKeys.length; j++)
                contextFeat[propertyKeys[j]] = context[c].properties[propertyKeys[j]];

            languages.reduce((memo, language, i) => {
                const suffix = language ? `_${language}` : '';
                const text = closestLang.getText(language, context[c].properties);
                memo[`text${suffix}`] = text.text;
                if (text.language) memo[`language${suffix}`] = text.language.replace('_', '-');
                if (i === 0) {
                    memo.text = memo[`text${suffix}`];
                    if (text.language) memo.language = memo[`language${suffix}`];
                }
                return memo;
            }, contextFeat);

            feature.context.push(contextFeat);
        }
    }

    return feature;
}

/**
 * Takes an array of contexts and returns geojson features, recording
 * used indexes along the way. Any of our `raw contexts => final output`
 * logic will ideally end up here.
 *
 * @param {Carmen} geocoder A carmen object used to generate the results
 * @param {array} contexts A contexts array of results to convert to features
 * @param {object} options A geocoder query options object
 * @return {object} Object with GeoJSON features on the 'features' property.
 */
function toFeatures(geocoder, contexts, options) {
    let features = [];
    const indexes = {};
    const by_place_name = {};

    for (let i = 0; i < contexts.length; i++) {
        const context = contexts[i];
        const index = geocoder.indexes[context[0].properties['carmen:index']];
        if (!filter.featureAllowed(index, context[0], options)) continue;

        // Convert this context array to a feature
        const feature = toFeature(context, index.geocoder_format, options.language, options.languageMode, options.debug, geocoder, options.clipBBox, options.routing);

        if (!options.allow_dupes) {
            const types = index.geocoder_feature_types_in_format;

            // Dedupe by place name, prefer feature with non-omitted, non-interpolated geom
            const keys = [feature.place_name];
            if (context[0].properties['carmen:spatialmatch'] !== undefined && context[0].properties['carmen:address'] !== undefined && !isShortAddressQuery(context) && types !== null) {
                keys.push(uniqueAddressId(geocoder, types, context));
            }
            const previous = keys.reduce((m, v) => (m || by_place_name[v] || m), false);
            if (previous) {
                if (features[previous.index].address && !feature.address) {
                    continue; // Don't allow street fallbacks to replace omitted or interpolated addresses
                }
                else if (features[previous.index].geometry.omitted && !feature.geometry.omitted) {
                    features[previous.index] = feature;
                }
                else if (features[previous.index].geometry.interpolated && !feature.geometry.interpolated) {
                    features[previous.index] = feature;
                }
                continue;
            }

            for (const k of keys) {
                by_place_name[k] = { feature: feature, index: features.length };
            }
        }
        features.push(feature);

        // Record index usage for this feature
        if (options.indexes) for (let k = 0; k < context.length; k++) {
            indexes[context[k].properties['carmen:index']] = true;
        }
    }

    // Re-sort array if we've changed composition
    if (features.length !== contexts.length) {
        features.sort((a, b) => b.relevance - a.relevance);
    }

    if (options.limit) features = features.slice(0, options.limit);

    const data = { features: features };
    if (options.indexes) data.indexes = Object.keys(indexes);
    return data;
}

/**
 * Generate an unique Id for an address results based on the cover text and
 * the context array.
 *
 * @param {object} geocoder - carmen object
 * @param {boolean|Set} types - set of types
 * @param {Array<object>} context - context array
 * @returns {string} unique result id
 */
function uniqueAddressId(geocoder, types, context) {
    const coverText = new Map();
    const covers = context[0].properties['carmen:spatialmatch'].covers;
    let text = '';
    for (let i = 0; i < covers.length; i++) {
        text += ` ${covers[i].text}`;
    }
    coverText.set(context[0].properties['carmen:index'], text);

    for (let j = 1; j < context.length; j++) {
        const indexName = context[j].properties['carmen:index'];
        // If we already have an string to represent this context, skip it.
        if (coverText.has(indexName)) continue;
        // If we got a list of acceptable types, respect it.
        if (!types || types.has(geocoder.indexes[indexName].type)) {
            coverText.set(indexName, context[j].properties['carmen:extid']);
        }
    }

    return '_' + Array.from(coverText.values()).join(':');
}

/**
 * Tests if text that matched a query is a numerical autocomplete or other short address autocomplete.
 *
 * This is used to determine when to skip generating a dedupe key based on the spatialmatch text + context,
 * to avoid overly deduping results that could have similar matching text but actually be different.
 *
 * Examples that will return true:
 * - 100 ma
 * - 100 m
 * - 1## ma
 * - 1## m
 * - 1# 11
 * - 1 11
 * - #
 * - 1
 *
 * Examples that will return false:
 * - 100 main st
 * - 1## main
 * - 1# 11t
 * - 1# 111
 * - 1# 111th
 *
 * @param {Array<object>} context - context array
 * @returns {boolean}
 */
function isShortAddressQuery(context) {
    // Match digits or #s, space, and up to 2 non-whitespace characters
    const shortAddressPattern = /^[\d#]+\s*\S{0,2}$/;
    const firstCover = context[0].properties['carmen:spatialmatch'].covers[0];

    return shortAddressPattern.test(firstCover.text);
}

/**
 * Attempt to locate text that closely matches the user's query
 * @param {object} item - GeoJSON feature
 * @param {object} geocoder - carmen object
 * @param {string} requestedLanguage - language code
 * @returns {object|undefined} matching text if found, undefined otherwise
 */
function getMatchingText(item, geocoder, requestedLanguage) {
    const closest = requestedLanguage ? closestLang.closestLangLabel(requestedLanguage, item.properties, 'carmen:text_') : undefined;
    const textKey = closest ? 'carmen:text_' + closest : 'carmen:text';
    const closestText = item.properties[textKey].split(',')[0];

    const hasMultiple = (Array.isArray(item.properties[textKey]) && item.properties[textKey].length > 1) || /,/.exec(item.properties[textKey]);
    if (item.properties['carmen:matches_language'] && (requestedLanguage ? closest === requestedLanguage : true) && !hasMultiple) return;

    // now we get to play the game of figuring out which phrase this was originally
    const textKeys = new Set(['carmen:text']);
    for (const key of Object.keys(item.properties)) {
        if (item.properties[key] && /^carmen:text_/.exec(key)) textKeys.add(key);
    }

    const sourceHash = item.properties['carmen:source_phrase_hash'];
    const hashMatches = new Map();
    for (const key of textKeys) {
        const texts = Array.isArray(item.properties[key]) ? item.properties[key] : item.properties[key].split(',');
        texts.forEach((sourceText) => {
            const hash = termops.phraseHash(sourceText);
            if (hash === sourceHash) {
                let validLanguages = hashMatches.get(sourceText);
                if (!validLanguages) {
                    validLanguages = [];
                    hashMatches.set(sourceText, validLanguages);
                }

                validLanguages.push(key);
            }
        });
    }

    let bestPhrase;
    if (hashMatches.size === 0) {
        return;
    } else if (hashMatches.size === 1) {
        bestPhrase = hashMatches.keys().next().value;
    } else {
        const qt = item.properties['carmen:query_text'].toLowerCase();
        const phrases = Array.from(hashMatches.keys()).map((a) => { return { key: a, dist: leven(qt, a.toLowerCase()) }; });
        phrases.sort((a, b) => a.dist - b.dist);
        bestPhrase = phrases[0].key;
    }

    const matches = {};
    for (const lang of hashMatches.get(bestPhrase)) {
        matches[lang] = bestPhrase;
    }

    let best = false;
    if (requestedLanguage) {
        best = closestLang.closestLangLabel(requestedLanguage, matches, 'carmen:text_');
        if (best) best = 'carmen:text_' + best;
    } else if (matches['carmen:text']) {
        best = 'carmen:text';
    }

    if (!best) {
        // if all we have is the default, go with that
        if (matches['carmen:text'] && Object.keys(matches).length === 1) {
            best = 'carmen:text';
        } else {
            // otherwise, go with the alphabetically first one that isn't the default, so we have a language to claim
            best = Object.keys(matches).filter((x) => { return x !== 'carmen:text'; }).sort()[0];
        }
    }

    if (!best) {
        // we weren't able to find something that worked; bail
        return;
    }

    const matching_language = best === 'carmen:text' ? null : best.replace('carmen:text_', '');
    const matching_text = bestPhrase.trim();

    // Determine if matching_text is from a category match, and if so, don't add matching text
    // Categories are stored in the carmen:text field, so don't check for category matches if the matching_text was a translation
    if (best === 'carmen:text') {
        const index = item.properties['carmen:index'];
        const indexCategories = geocoder.indexes[index].categories;
        const categoryMatch = indexCategories ? indexCategories.has(matching_text) : null;
        if (categoryMatch) return;
    }

    if (!matching_text || matching_text === closestText) {
        // this was all for nothing :(
        return;
    } else {
        item.matching_text = matching_text;
        const matched = { matching_text: matching_text };
        if (matching_language && matching_language !== closest) {
            item.matching_language = matching_language.replace('_', '-');
            matched.matching_language = matching_language.replace('_', '-');
        }
        return matched;
    }
}

/**
 * getIntersectionStreetName - helper function to get the street to add to the cross street
 * this is for Street B in Street A and Street B
 * the carmen:text field has a number of synonyms, we need to pick out the one similar to what the user typed
 * @param {Object} geocoder Geocoder object
 * @param {object} properties A feature properties object
 * @return {string} returns the correct carmen:text synonym based on the input query
 */
function getIntersectionStreetName(source, properties) {
    if (properties['carmen:intersection'] && properties['carmen:query_text'] !== undefined) {
        let featureSynonymMatch = ' ';
        properties['carmen:text'].split(',').forEach((synonymText) => {
            const tokenizedIntersection = source.simple_replacer.replacer(termops.tokenize(synonymText).tokens);
            if (tokenizedIntersection.join(' ').indexOf(properties['carmen:query_text']) >= 0) {
                featureSynonymMatch = synonymText;
            }
        });
        return featureSynonymMatch.trim();
    }
}
