var termops = require('./util/termops'),
    feature = require('./util/feature'),
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
    source._geocoder._known = source._geocoder._known || { term:{} };
    var known = source._geocoder._known;

    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.

    docs = assignParts(docs);
    var freq = generateFrequency(docs);
    var getter = source.getGeocoderData.bind(source);

    // Ensures all shards are loaded.
    var ids = Object.keys(freq).map(function(v) { return parseInt(v, 10); });
    source._geocoder.getall(getter, 'freq', ids, function(err) {
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
        var patch = { grid: {}, term: {}, phrase: {}, degen: {} };
        var features = {};

        for (var i = 0; i < docs.length; i++) loadDoc(docs[i], freq, patch, known);

        var q = queue(500);
        q.defer(function(features, callback) {
            feature.putFeatures(source, docs, function(err) {
                if (err) return callback(err);
                // @TODO manually calls _commit on MBTiles sources.
                // This ensures features are persisted to the store for the
                // next run which would not necessarily be the case without.
                // Given that this is a very performant pattern, commit may
                // be worth making a public function in node-mbtiles (?).
                return source._commit ? source._commit(callback) : callback();
            });
        }, features);
        _(patch).each(setParts);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(function(data, type, callback) {
                var ids = Object.keys(data);
                var cache = source._geocoder;
                cache.getall(getter, type, ids, function(err) {
                    if (err) return callback(err);
                    for (var i = 0; i < ids.length; i++) {
                        var id = ids[i];
                        // This merges new entries on top of old ones.
                        switch (type) {
                        case 'term':
                            var current = cache.get(type, id);
                            if (current) {
                                current.push.apply(current, data[id]);
                                if (current.length > 2000) {
                                    current.sort();
                                    current = _(current).uniq(true);
                                }
                            } else {
                                current = data[id];
                            }
                            cache.set(type, id, current);
                            break;
                        case 'grid':
                        case 'degen':
                            var current = cache.get(type, id);
                            if (current) {
                                current.push.apply(current, data[id]);
                            } else {
                                current = data[id];
                            }
                            cache.set(type, id, current);
                            break;
                        case 'phrase':
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

function loadDoc(doc, freq, patch, known) {
    doc._hash = termops.feature(doc._id.toString());
    doc._grid = doc._grid || [];
    if (doc._zxy) for (var i = 0; i < doc._zxy.length; i++) {
        doc._grid.push(ops.zxy(doc._hash, doc._zxy[i]));
    }

    var phrases = doc._phrases;
    var termsets = doc._termsets;
    var termsmaps = doc._termsmaps;

    for (var x = 0; x < phrases.length; x++) {
        var name = phrases[x];
        var terms = termsets[x];
        patch.grid[name] = patch.grid[name] || [];
        patch.grid[name].push.apply(patch.grid[name], doc._grid);
        patch.phrase[name] = patch.phrase[name] || terms;

        var id;
        var id1 = null;
        var id2 = null;
        var weight1 = 0;
        var weight2 = 0;
        var termsmap = termsmaps[x];

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

            // This check avoids doing redundant work for a term once
            // it is known to be indexed. @TODO known issue, this prevents
            // degens from being used as an approach to avoiding fnv1a term
            // collisions.
            if (known.term[id]) continue;
            known.term[id] = true;

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
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
            var sigtext = terms.length > 3 ?
                debug[id1] + ' ' + debug[id2] :
                debug[id1];
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
            texts = doc._text.split(',');

        for (var x = 0; x < texts.length; x++) {
            var tokens = termops.tokenize(texts[x]);
            if (!tokens.length) continue;
            phrases.push(termops.phrase(tokens));
            termsets.push(termops.terms(tokens));
            termsmaps.push(termops.termsMap(tokens));
        }

        doc._phrases = phrases;
        doc._termsets = termsets;
        doc._termsmaps = termsmaps;
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
        var termsets = docs[i]._termsets;
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
