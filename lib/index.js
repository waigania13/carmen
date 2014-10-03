var termops = require('./util/termops'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    DEBUG = process.env.DEBUG;

var indexdocs = require('./indexer/indexdocs');

module.exports = index;
module.exports.update = update;
module.exports.generateFrequency = generateFrequency;
module.exports.store = store;

function index(geocoder, from, to, options, callback) {
    options = options || {};

    to.startWriting(function(err) {
        if (err) return callback(err);
        if (options.shardlevel || from._geocoder.shardlevel) {
            var shardlevel = options.shardlevel || from._geocoder.shardlevel;
            to.putInfo({geocoder_shardlevel:shardlevel}, function(err) {
                if (err) return callback(err);
                to._geocoder.shardlevel = shardlevel;
                process(options);
            });
        } else {
            process(options);
        }
        function process(options) {
            from.getIndexableDocs(options, function(err, docs, options) {
                if (err) return callback(err);
                if (!docs.length) {
                    geocoder.emit('store');
                    store(to, function(err) {
                        if (err) return callback(err);
                        to.stopWriting(callback);
                    });
                } else {
                    geocoder.emit('index', docs.length);
                    update(to, docs, from._geocoder.zoom, function(err) {
                        if (err) return callback(err);
                        process(options);
                    });
                }
            });
        };
    });
}

// # Update
//
// Updates the source's index with provided docs.
//
// @param {Object} source - a Carmen source
// @param {Array} docs - an array of documents
// @param {Function} callback
function update(source, docs, zoom, callback) {
    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.
    try {
        var freq = generateFrequency(docs);
    } catch(err) {
        return callback(err);
    }

    // Do this within each shard worker.
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
        indexdocs(docs, freq, zoom, updateCache);
    });

    function updateCache(err, patch) {
        if (err) return callback(err);

        // ? Do this in master?
        var features = {};
        var q = queue(500);
        q.defer(function(features, callback) {
            feature.putFeatures(source, patch.docs, function(err) {
                if (err) return callback(err);
                // @TODO manually calls _commit on MBTiles sources.
                // This ensures features are persisted to the store for the
                // next run which would not necessarily be the case without.
                // Given that this is a very performant pattern, commit may
                // be worth making a public function in node-mbtiles (?).
                return source._commit ? source._commit(callback) : callback();
            });
        }, features);
        for (var type in patch) if (type !== 'docs') setParts(patch[type], type);
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
                                if (current.length > 2000) current = uniq(current);
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

function generateFrequency(docs) {
    var freq = {};

    // Uses freq[0] as a convention for storing total # of docs.
    // @TODO determine whether 0 can really ever be a relevant term
    // when using fnv1a.
    freq[0] = [0];
    for (var i = 0; i < docs.length; i++) {
        if (!docs[i]._text) {
            throw new Error('doc has no _text');
        }
        var texts = docs[i]._text.split(',');
        for (var x = 0; x < texts.length; x++) {
            var tokens = termops.tokenize(texts[x]);
            var terms = termops.terms(tokens);
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

// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
function store(source, callback) {
    var tasks = [];

    ['freq','term','phrase','grid','degen'].forEach(loadTerm);

    function loadTerm(type) {
        var cache = source._geocoder;
        tasks = tasks.concat(cache.list(type).map(loadShard));

        function loadShard(shard) {
            var ids = cache.list(type, shard);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                switch (type) {
                    case 'term':
                    case 'grid':
                    case 'degen':
                        var data = source._geocoder.get(type, id) || [];
                        source._geocoder.set(type, id, uniq(data));
                        break;
                }
            }
            return [type, shard];
        }
    }
    var q = queue(10);
    tasks.forEach(function (task) {
        q.defer(function(task, callback) {
            var type = task[0];
            var shard = task[1];
            var cache = source._geocoder;
            source.putGeocoderData(type, shard, cache.pack(type, shard), callback);
        }, task);
    });
    q.awaitAll(function(err) {
        if (err) return callback(err);
        source._geocoder.unloadall('freq');
        source._geocoder.unloadall('term');
        source._geocoder.unloadall('phrase');
        source._geocoder.unloadall('grid');
        source._geocoder.unloadall('degen');
        callback();
    });
}
