module.exports.toFeature = toFeature;
var closestLang = require('./closest-lang');
var featureMatchesLanguage = require('./filter').featureMatchesLanguage;
var termops = require('./termops');

/**
 * toFeature - Reformat a context array into a Carmen GeoJSON feature
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Objects containing default/langauge specific formatting for `place_name`.
 * @param {String} language code to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter resutlts strictly to a specific language. Undefined defaults null.
 * @param {Boolean} debug Enable debug mode to expose internal properties in results
 * @return {Object} Carmen GeoJSON feature
 */
function toFeature(context, format, language, languageMode, debug, geocoder) {
    var feat = context[0];
    if (!feat.properties['carmen:center']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

    // check for whether or not there are any parts of the response in the queried language.
    // if not, use the default templating rather than the one appropriate to the queried language.
    var languageFormat = language ? closestLang(language, format, "") : false;
    var includesMatching = false;
    for (var k = 0; k < context.length; k++) {
        if (languageFormat) {
            var languageText = language ? closestLang(language, context[k].properties, "carmen:text_") : false;
            if (languageText ||
                context[k].properties.language === language) {
                format = languageFormat;
                break;
            }
        }

        if (context[k].properties['carmen:query_text'] && geocoder) {
            var added = addMatchingText(context[k], geocoder, language);
            includesMatching = includesMatching || added;
        }
    }
    if (typeof format === 'object') format = format['default'];

    var place_names = {};
    var passes = ['normal'];
    if (includesMatching) passes.push('matching');
    passes.forEach(function(pass) {
        var place_name;
        // Use geocoder_format to format output if applicable
        if (!format || format === true || format === 1) {
            place_name = ((feat.properties['carmen:address'] ? feat.properties['carmen:address'] + ' ' : '') +
                context
                    .filter(function(f) { return pass == 'matching' || featureMatchesLanguage(f, { language: language, languageMode: languageMode }); })
                    .map(function(f) { return (pass == 'matching' ? f.matching_text : undefined) || closestLang.getText(language, f.properties).text; })
                    .join(', ')
            ).trim();
        } else {
            // Create template object that lists what we want to know
            var template = format.replace(/ /g,'').replace(/,/g,'').trim().replace(/^{/,'').replace(/}$/,'').split('}{');

            // Go through template object one-by-one & check to see if context is available for this template property
            for (var i = 0; i < template.length; i++) {
                var t = template[i].split('.');
                var templateProp     = t[0]; // ex. 'address','place'
                var templateSubprop  = t[1]; // ex. 'name','number'
                var val = '';

                // In cases where subprop is either `name` or `number`, we map to `text` and `address` respectively.
                // Otherwise, we look for the subprop itself
                // If not found, remove from the original format string

                for (var x = 0; x < context.length; x++) {
                    var f = context[x];
                    if (!f.properties['carmen:text']) throw new Error('Feature has no carmen:text');
                    if (pass == 'normal' && !featureMatchesLanguage(f, { language: language, languageMode: languageMode })) continue;
                    var carmenProp = f.properties['carmen:extid'].split('.')[0]; // ex. 'place', 'postcode', 'region'

                    // If we found a match between the template property and one within the returned context
                    if (templateProp == carmenProp) {
                        if (templateSubprop == '_name') {
                            // `name` is a hardcoded subproperty that maps to carmen:text
                            val = (pass == 'matching' ? f.matching_text : undefined) || closestLang.getText(language, f.properties).text;
                            format = format.replace('{' + templateProp + '._name}',val);
                        } else if (templateSubprop == '_number') {
                            // `address` is a hardcored subproperty that maps to carmen:address
                            val = f.properties['carmen:address'];
                            // in case val is a digit and not a comma-separated string
                            if (typeof val === 'number') { val += ''; }
                            val = (val||'').split(',')[0];
                            format = format.replace('{' + templateProp + '._number}',val);
                        } else {
                            // otherwise, subproperties appear as standard strings within feature properties
                            val = f.properties[templateSubprop];
                            if (val) {
                                format = format.replace('{' + templateProp + '.' + templateSubprop + '}',val);
                            } else {
                                // No matches or text, remove altogether
                                format = format.replace('{' + templateProp + '.' + templateSubprop + '}','');
                            }
                        }
                    }
                }
            }
            // Handle any cases where context wasn't available by getting rid of curly braces, awkwards spaces/commas
            format = format.replace(/\{.+?\}/g, '').replace(/ \, /g,', ').replace(/  /g,' ').replace(/\, \,/g,'').replace(/^\,/,'').replace(/\,\,/,',').trim().replace(/\,$/,'');
            place_name = format;
        }
        place_names[pass] = place_name;
    });

    var featureText = closestLang.getText(language, feat.properties);
    var feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        text: featureText.text,
        place_name: place_names.normal,
        place_type: feat.properties['carmen:types'],
        relevance: context._relevance,
        properties: {}
    };
    if (feat.matching_text) feature.matching_text = feat.matching_text;
    if (feat.matching_language) feature.matching_language = feat.matching_language;
    if (place_names.matching) feature.matching_place_name = place_names.matching;

    if (featureText.language) feature.language = featureText.language.replace("_", "-");

    if (feat.bbox) feature.bbox = feat.bbox;

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
    if (feat.properties['carmen:address']) feature.address = feat.properties['carmen:address'];
    for (var key in context[0].properties) if (key.indexOf('carmen:') !== 0 || debug) {
        if (key === 'id') continue;
        feature.properties[key] = context[0].properties[key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (var c = 1; c < context.length; c++) {
            if (!context[c].properties['carmen:extid']) throw new Error('Feature has no carmen:extid');
            if (!featureMatchesLanguage(context[c], { language: language, languageMode: languageMode })) continue;

            var contextFeat = closestLang.getText(language, context[c].properties);
            contextFeat.id = context[c].properties['carmen:extid'];

            // copy over all non-'carmen:*' properties
            var propertyKeys = Object.keys(context[c].properties).filter(function(prop) {
                return !/^carmen:/.test(prop) && !/^id$/.test(prop);
            });

            for (var j = 0; j < propertyKeys.length; j++)
                contextFeat[propertyKeys[j]] = context[c].properties[propertyKeys[j]];

            if (context[c].matching_text) contextFeat.matching_text = context[c].matching_text;
            if (context[c].matching_language) contextFeat.matching_language = context[c].matching_language;

            feature.context.push(contextFeat);
        }
    }

    return feature;
}

function addMatchingText(item, geocoder, requestedLanguage) {
    var closest = requestedLanguage ? closestLang.closestLangLabel(requestedLanguage, item.properties, 'carmen:text_') : undefined;
    var textKey = closest ? "carmen:text_" + closest : "carmen:text";
    var closestText = item.properties[textKey].split(',')[0];

    if (item.properties['carmen:matches_language'] && !/,/.exec(item.properties[textKey])) return;

    // now we get to play the came of figuring out which phrase this was originally
    var source = geocoder.byidx[item.properties['carmen:idx']];

    var allPhrases = new Map();
    var original = new Map();
    for (var key of Object.keys(item.properties)) {
        if (!/^carmen:text/.exec(key)) continue;

        item.properties[key].split(',').forEach(function(sourceText) {
            var texts = termops.getIndexableText(source.token_replacer, source.globaltokens,
                {properties:{'carmen:text': sourceText}}
            );
            if (texts.length) {
                var phrases = termops.getIndexablePhrases(texts[0].tokens, {"__COUNT__": [1]});
                phrases.forEach(function(phrase) {
                    if (!allPhrases.has(phrase.phrase)) allPhrases.set(phrase.phrase, new Set());
                    allPhrases.get(phrase.phrase).add(key);

                    var oKey = phrase.phrase + "/" + key;
                    if (!original.has(oKey)) original.set(oKey, new Set());
                    original.get(oKey).add(sourceText);
                })
            }
        })
    }

    var query = termops.encodableText(item.properties['carmen:query_text']);
    var regex = new RegExp("^" + query + (item.properties['carmen:prefix'] ? "" : "$"));

    var matches = {};
    for (var candidate of allPhrases.keys()) {
        if (regex.exec(candidate)) {
            for (var phraseKey of allPhrases.get(candidate)) {
                if (!matches.hasOwnProperty(phraseKey)) matches[phraseKey] = candidate;
            }
        }
    }

    var best;
    if (requestedLanguage) {
        best = closestLang.closestLangLabel(requestedLanguage, matches, 'carmen:text_');
        if (best) best = 'carmen:text_' + best;
    } else if (matches['carmen:text']) {
        best = 'carmen:text';
    }
    if (!best) {
        // if all we have is the default, go with that
        if (matches['carmen:text'] && Object.keys(matches).length == 1) {
            best = 'carmen:text';
        } else {
            // otherwise, go with the alphabetically first one that isn't the default, so we have a language to claim
            best = Object.keys(matches).filter(function(x) { return x != 'carmen:text'; }).sort()[0];
        }
    }

    var matching_language = best == "carmen:text" ? null : best.replace("carmen:text_", "");
    var match_key = matches[best] + "/" + best;
    var matching_set = original.has(match_key) ? Array.from(original.get(match_key)) : [];
    var matching_text = matching_set.length ? matching_set[0] : null;

    if (!matching_text || matching_text == closestText) {
        // this was all for nothing :(
        return;
    } else {
        item.matching_text = matching_text;
        if (matching_language && matching_language != closest) {
            item.matching_language = matching_language.replace('_', '-');
        }
        return true;
    }
}