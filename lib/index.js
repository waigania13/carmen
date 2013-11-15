var termops = require('./util/termops'),
    ops = require('./util/ops'),
    _ = require('underscore'),
    queue = require('queue-async'),
    DEBUG = process.env.DEBUG;

module.exports = index;
module.exports.loadDoc = loadDoc;
module.exports.assignParts = assignParts;
module.exports.generateFrequency = generateFrequency;

// # Index
// @param {Object} source - a Carmen source
// @param {Array} docs - an array of documents
// @param {Function} callback
function index(source, docs, callback) {

    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.

    docs = assignParts(docs);
    var freq = generateFrequency(docs);

    // Ensures all shards are loaded.
    var ids = Object.keys(freq).map(function(v) { return parseInt(v, 10); });
    source._geocoder.getall(source.getGeocoderData.bind(source), 'freq', ids, function(err) {
        if (err) return callback(err);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            freq[id][0] = (source._geocoder.get('freq', id) || [0])[0] + freq[id][0];
            source._geocoder.set('freq', id, freq[id]);
        }
        indexDocs(freq[0], freq, callback);
    });

    // Second pass over docs.
    // - Create term => docid index. Uses calculated frequencies to index only
    //   significant terms for each document.
    // - Create id => grid zxy index.
    function indexDocs(approxdocs, freq, callback) {
        var patch = { grid: {}, term: {}, phrase: {}, degen: {}, feature: {} };
        var degenerated = {};

        for (var i = 0; i < docs.length; i++) loadDoc(docs[i], freq, patch, degenerated);

        var q = queue(500);
        _(patch).each(setParts);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(function(data, type, callback) {
                var ids = Object.keys(data);
                var cache = type === 'feature' ? source._features : source._geocoder;
                cache.getall(source.getGeocoderData.bind(source), type, ids, function(err) {
                    if (err) return callback(err);
                    for (var i = 0; i < ids.length; i++) {
                        var id = ids[i];
                        // This merges new entries on top of old ones.
                        switch (type) {
                        case 'term':
                        case 'grid':
                        case 'degen':
                            var current = cache.get(type, id) || [];
                            current.push.apply(current, data[id]);
                            cache.set(type, id, current);
                            break;
                        case 'phrase':
                        case 'feature':
                            cache.set(type, id, data[id]);
                            break;
                        }
                    }
                    callback();
                });
            }, data, type);
        }
    }
};

function loadDoc(doc, freq, patch, degenerated) {
    doc.doc.id = doc.id;
    doc.hash = termops.feature(doc.id.toString());
    doc.zxy = doc.zxy || [];
    for (var i = 0; i < doc.zxy.length; i++) {
        doc.zxy[i] = ops.zxy(doc.hash, doc.zxy[i]);
    }

    patch.feature[doc.hash] = patch.feature[doc.hash] || {};
    patch.feature[doc.hash][doc.id] = doc.doc;

    var phrases = doc.phrases;
    var termsets = doc.termsets;
    var termsmaps = doc.termsmaps;

    for (var x = 0; x < phrases.length; x++) {
        var id = phrases[x];
        patch.phrase[id] = patch.phrase[id] || termsets[x];
        patch.grid[id] = patch.grid[id] || [];
        patch.grid[id].push.apply(patch.grid[id], doc.zxy);
    }

    for (var x = 0; x < termsets.length; x++) {
        var terms = termsets[x];
        var id;
        var id1 = null;
        var id2 = null;
        var weight1 = 0;
        var weight2 = 0;
        var termsmap = termsmaps[x];
        var name = phrases[x];

        for (var i = 0; i < terms.length; i++) {
            id = terms[i];
            var weight = Math.log(1 + freq[0][0]/freq[id][0]);
            if (weight > weight1) {
                if (weight1 >= weight2) {
                    weight2 = weight1;
                    id2 = id1;
                }
                weight1 = weight;
                id1 = id;
            } else if (weight > weight2) {
                weight2 = weight;
                id2 = id;
            }

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
            if (degenerated[id]) continue;
            degenerated[id] = true;
            var degens = termops.degens(termsmap[id]);
            for (var j = 0; j < degens.length; j = j+2) {
                var d = degens[j];
                patch.degen[d] = patch.degen[d] || [];
                patch.degen[d].push(degens[j+1]);
            }
        }

        patch.term[id1] = patch.term[id1] || [];
        patch.term[id1].push(name);
        if (terms.length > 3) {
            patch.term[id2] = patch.term[id2] || [];
            patch.term[id2].push(name);
        }

        // Debug significant term selection.
        if (DEBUG) {
            var debug = termsmap;
            var oldtext = terms.map(function(id) { return debug[id]; }).join(' ');
            var sigtext = sigterms.map(function(id) { return debug[id]; }).join(' ');
            if (oldtext !== sigtext)  console.log('%s => %s', oldtext, sigtext);
        }
    }
}

function assignParts(docs) {

    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i],
            phrases = [],
            termsets = [],
            termsmaps = [],
            texts = doc.text.split(',');

        for (var x = 0; x < texts.length; x++) {
            var tokens = termops.tokenize(texts[x]);
            if (!tokens.length) continue;
            phrases.push(termops.phrase(tokens));
            termsets.push(termops.terms(tokens));
            termsmaps.push(termops.termsMap(tokens));
        }

        doc.phrases = phrases;
        doc.termsets = termsets;
        doc.termsmaps = termsmaps;
    }

    return docs;
}

function generateFrequency(docs) {
    var freq = {};

    // Uses freq[0] as a convention for storing total # of docs.
    // @TODO determine whether 0 can really ever be a relevant term
    // when using fnv1a.
    freq[0] = [0];
    for (var i = 0; i < docs.length; i++) {
        var termsets = docs[i].termsets;
        for (var j = 0; j < termsets.length; j++) {
            var terms = termsets[j];
            for (var k = 0; k < terms.length; k++) {
                var id = terms[k];
                freq[id] = freq[id] || [0];
                freq[id][0]++;
                freq[0][0]++;
            }
        }
    }

    return freq;
}
