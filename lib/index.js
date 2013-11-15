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

    phrases.forEach(function(id, x) {
        patch.phrase[id] = patch.phrase[id] || termsets[x];
        patch.grid[id] = patch.grid[id] || [];
        patch.grid[id].push.apply(patch.grid[id], doc.zxy);
    });

    termsets.forEach(loadTerm);

    function loadTerm(terms, x) {
        var id;
        var termsmap = termsmaps[x];
        var name = phrases[x];
        var weights = [];
        var limit = terms.length > 3 ? 2 : 1;

        for (var i = 0; i < terms.length; i++) {
            id = terms[i];
            var weight = Math.log(1 + freq[0][0]/freq[id][0]);
            weights.push([id, weight]);

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
            if (degenerated[id]) continue;
            degenerated[id] = true;
            var degens = termops.degens(termsmap[id]);
            var keys = Object.keys(degens);
            for (var j = 0; j < keys.length; j++) {
                var d = keys[j];
                patch.degen[d] = patch.degen[d] || [];
                patch.degen[d].push(degens[d]);
            }
        }

        // Limit indexing to the *most* significant terms for a
        // document. Currently uses rough heuristic (floor+sqrt) to
        // determine how many of the top words to grab.
        weights.sort(function(a,b) {
            return a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0;
        });
        var sigterms = [];
        for (i = 0; i < limit; i++) sigterms.push(weights[i][0]);

        // Debug significant term selection.
        if (DEBUG) {
            var debug = termsmap;
            var oldtext = terms.map(function(id) { return debug[id]; }).join(' ');
            var sigtext = sigterms.map(function(id) { return debug[id]; }).join(' ');
            if (oldtext !== sigtext)  console.log('%s => %s', oldtext, sigtext);
        }

        for (i = 0; i < sigterms.length; i++) {
            id = sigterms[i];
            patch.term[id] = patch.term[id] || [];
            patch.term[id].push(name);
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
