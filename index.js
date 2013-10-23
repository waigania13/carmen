var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var basepath = path.resolve(__dirname + '/tiles');
var sm = new (require('sphericalmercator'))();
var crypto = require('crypto');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');
var EventEmitter = require('events').EventEmitter;
var DEBUG = process.env.DEBUG;
var Cache = require('./lib/cxxcache.js');
var lockingCache = {};
var fnv = require('./lib/fnv'),
    fnv1a = fnv.fnv1a,
    fnvfold = fnv.fnvfold;
var Locking = require('./lib/locking');
var defer = typeof setImmediate === 'undefined' ? process.nextTick : setImmediate;

Carmen.fnv1a = fnv1a;
Carmen.fnvfold = fnvfold;

// Resolve the UTF-8 encoding stored in grids to simple number values.
function resolveCode(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
}

// Convert character code to UTF grid key.
function toChar(key) {
    key += 32;
    if (key >= 34) key++;
    if (key >= 92) key++;
    return String.fromCharCode(key);
}

// Clean up internal fields/prep a feature entry for external consumption.
function feature(id, type, data) {
    data.id = type + '.' + id;
    data.type = data.type || type;
    if ('string' === typeof data.bounds)
        data.bounds = data.bounds.split(',').map(parseFloat);
    if ('search' in data)
        delete data.search;
    if ('rank' in data)
        delete data.rank;
    return data;
}

require('util').inherits(Carmen, EventEmitter);

function Carmen(options) {
    if (!options) throw new Error('Carmen options required.');

    var remaining = Object.keys(options).length;
    var done = function(err) {
        if (!--remaining || err) {
            remaining = -1;
            this._error = err;
            this._opened = true;
            this.emit('open', err);
        }
    }.bind(this);

    this.indexes = _(options).reduce(loadIndex, {});

    function loadIndex(memo, source, key) {
        // Legacy support.
        source = source.source ? source.source : source;

        memo[key] = source;
        if (source.open) {
            source.getInfo(function(err, info) {
                if (err) return done(err);
                source._carmen = source._carmen || new Cache(key, info.shardlevel || 0);
                source._carmen.zoom = info.maxzoom;
                source._carmen.name = key;
                source._carmen.idx = Object.keys(options).indexOf(key);
                return done();
            });
        } else {
            source.once('open', function(err) {
                if (err) return done(err);
                source.getInfo(function(err, info) {
                    if (err) return done(err);
                    source._carmen = source._carmen || new Cache(key, +info.shardlevel || 0);
                    source._carmen.zoom = info.maxzoom;
                    source._carmen.name = key;
                    source._carmen.idx = Object.keys(options).indexOf(key);
                    return done();
                });
            });
        }
        return memo;
    }
}

Carmen.S3 = function() { return require('./api-s3'); };
Carmen.MBTiles = function() { return require('./api-mbtiles'); };

// Ensure that all carmen sources are opened.
Carmen.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};


// Main geocoding API entry point.
// Returns results across all indexes for a given query.
Carmen.prototype.geocode = function(query, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.geocode(query, callback);
        }.bind(this));
    }

    var indexes = this.indexes;
    var types = Object.keys(indexes);
    var zooms = [];
    var data = {
        query: Carmen.tokenize(query, true),
        stats: {}
    };
    var carmen = this;

    // lon,lat pair. Provide the context for this location.
    if (data.query.length === 2 && _(data.query).all(_.isNumber)) {
        return this.context(data.query[0], data.query[1], null, function(err, context) {
            if (err) return callback(err);
            data.results = context.length ? [context] : [];
            return callback(null, data);
        });
    }

    // keyword search. Find matching features.
    data.stats.searchTime = +new Date();

    function search(callback) {
        var feats = [];
        var grids = [];
        var remaining = types.length;
        types.forEach(function(dbname, pos) {
            carmen.search(indexes[dbname], data.query.join(' '), null, function(err, feat, grid, stats) {
                if (err) {
                    remaining = 0;
                    return callback(err);
                }
                if (grid.length) {
                    var z = indexes[dbname]._carmen.zoom;
                    if (zooms.indexOf(z) === -1) zooms.push(z);
                }
                feats[pos] = feat;
                grids[pos] = grid;
                if (DEBUG) data.stats['search.' + dbname] = stats;
                if (!--remaining) {
                    zooms = zooms.sort(function(a,b) { return a < b ? -1 : 1; });
                    data.stats.searchTime = +new Date() - data.stats.searchTime;
                    data.stats.searchCount = _(grids).reduce(function(sum, v) {
                        return sum + v.length;
                    }, 0);
                    data.stats.relevTime = +new Date();
                    callback(null, feats, grids, zooms);
                }
            });
        });
    }

    function relev(feats, grids, zooms, callback) {
        var relevd = {};
        var coalesced = {};

        // Coalesce relevs into higher zooms, e.g.
        // z5 inherits relev of overlapping tiles at z4.
        // @TODO assumes sources are in zoom ascending order.
        var xd = Math.pow(2,39);
        var yd = Math.pow(2,25);
        for (var h = 0; h < grids.length; h++) {
            var grid = grids[h];
            var feat = feats[h];
            var z = indexes[types[h]]._carmen.zoom;
            for (var i = 0; i < grid.length; i++) {
                var f = feat[grid[i] % yd];
                if (!f) continue;
                var x = Math.floor(grid[i]/xd);
                var y = Math.floor(grid[i]%xd/yd);
                var zxy = (z * Math.pow(2,28)) + (x * Math.pow(2,14)) + y;
                // @TODO this is an optimization that  assumes multiple
                // DBs do not use the same zoom level.
                if (!coalesced[zxy]) coalesced[zxy] = [f];
                var a = 0;
                while (zooms[a] < z) {
                    var p = zooms[a];
                    var s = 1 << (z-p);
                    var pxy = (p * Math.pow(2,28)) + (Math.floor(x/s) * Math.pow(2,14)) + Math.floor(y/s);
                    if (coalesced[pxy]) coalesced[zxy].push.apply(coalesced[zxy],coalesced[pxy]);
                    a++;
                }
            }
        }

        var results = _(coalesced).chain().reduce(function(memo, rows) {
            // Sort by db, relev such that total relev can be
            // calculated without results for the same db being summed.
            rows.sort(function(a, b) {
                var ai = types.indexOf(a.db);
                var bi = types.indexOf(b.db);
                if (ai < bi) return -1;
                if (ai > bi) return 1;
                if (a.relev > b.relev) return -1;
                if (a.relev < b.relev) return 1;
                if (a.reason > b.reason) return -1;
                if (a.reason < b.reason) return 1;
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            });
            var relev = Carmen.usagerelev(data.query, rows);

            // A threshold here reduces results early.
            // @TODO tune this.
            // if (relev < 0.75) return memo;

            for (var i = 0, l = rows.length; i < l; i++) {
                var fullid = rows[i].db + '.' + rows[i].id;
                relevd[fullid] = relevd[fullid] || rows[i];
                memo[rows[i].tmpid] = memo[rows[i].tmpid] || {
                    db: rows[i].db,
                    id: rows[i].id,
                    tmpid: rows[i].tmpid,
                    relev: relev
                };
            }
            return memo;
        }, {}).toArray().value();
        results.sort(function(a, b) {
            return a.relev > b.relev ? -1 :
                a.relev < b.relev ? 1 :
                a.tmpid < b.tmpid ? -1 :
                a.tmpid > b.tmpid ? 1 : 0;
        });
        results = results.reduce(function(memo, feature) {
            if (!memo.length || memo[0].relev - feature.relev < 0.5) {
                memo.push(feature);
            }
            return memo;
        }, []);
        results = results.map(function(f) { return f.db + '.' + f.id; });

        data.stats.relevTime = +new Date() - data.stats.relevTime;
        data.stats.relevCount = results.length;

        if (!results.length) return callback(null, results);

        // Disallow more than 50 of the best results at this point.
        if (results.length > 50) results = results.slice(0,50);

        var start = +new Date();
        var matches = [];
        var contexts = [];
        var remaining = results.length;
        results.forEach(function(term) {
            var termid = parseInt(term.split('.')[1], 10);
            var dbname = term.split('.')[0];
            carmen.indexes[dbname].getFeature(termid, function(err, feat) {
                if (err) return (remaining = 0) && callback(err);
                carmen.contextByFeature(feature(termid, dbname, feat), function(err, context) {
                    if (err) return (remaining = 0) && callback(err);
                    contexts.push(context);
                    if (!--remaining) {
                        data.stats.contextTime = +new Date() - start;
                        data.stats.contextCount = contexts.length;
                        return callback(null, contexts, relevd);
                    }
                });
            });
        });
    }

    search(function(err, feats, grids, zooms) {
        if (err) return callback(err);
        relev(feats, grids, zooms, function(err, contexts, relevd) {
            if (err) return callback(err);

            var maxrelev = 0;
            contexts.sort(function(a, b) {
                // sort by usagerelev score.
                var ac = [];
                var bc = [];
                for (var i = 0; i < a.length; i++) if (relevd[a[i].id]) {
                    ac.push(relevd[a[i].id]);
                    a[i].relev = relevd[a[i].id].relev;
                }
                for (i = 0; i < b.length; i++) if (relevd[b[i].id]) {
                    bc.push(relevd[b[i].id]);
                    b[i].relev = relevd[b[i].id].relev;
                }
                var arelev = Carmen.usagerelev(data.query, ac);
                var brelev = Carmen.usagerelev(data.query, bc);
                if (arelev > brelev) return -1;
                if (arelev < brelev) return 1;

                // within results of equal relevance.
                a = a[0], b = b[0];

                // primary sort by result's index.
                var adb = a.id.split('.')[0];
                var bdb = b.id.split('.')[0];
                var ai = types.indexOf(adb);
                var bi = types.indexOf(bdb);
                if (ai < bi) return -1;
                if (ai > bi) return 1;

                // secondary sort by score key.
                var as = a.score || 0;
                var bs = b.score || 0;
                if (as > bs) return -1;
                if (as < bs) return 1;

                // last sort by id.
                if (a.id > b.id) return -1;
                if (a.id < b.id) return 1;
                return 0;
            });
            data.results = contexts;

            data.stats.relev = maxrelev;
            return callback(null, data);
        });
    });
};

// Returns a hierarchy of features ("context") for a given lon,lat pair.
Carmen.prototype.context = function(lon, lat, maxtype, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.context(lon, lat, maxtype, callback);
        }.bind(this));
    }

    var context = [];
    var indexes = this.indexes;
    var types = Object.keys(indexes);
    types = types.slice(0, maxtype ? types.indexOf(maxtype) : types.length);
    var remaining = types.length;

    // No-op context.
    if (!remaining) return callback(null, context);

    var scan = [
        [0,0],
        [0,1],
        [0,-1],
        [1,0],
        [1,1],
        [1,-1],
        [-1,0],
        [-1,1],
        [-1,-1]
    ];

    types.forEach(loadType);

    function loadType(type, pos) {
        var source = indexes[type];
        var zoom = source._carmen.zoom;
        var xyz = sm.xyz([lon,lat,lon,lat], zoom);
        var ckey = (zoom * 1e14) + (xyz.minX * 1e7) + xyz.minY;

        lockingCache[source.id] = lockingCache[source.id] || {};
        var cache = lockingCache[source.id];

        function done(err, grid) {
            if (err && err.message !== 'Grid does not exist') {
                remaining = 0;
                return callback(err);
            }
            if (grid) {
                var resolution = 4;
                var px = sm.px([lon,lat], zoom);
                var y = Math.round((px[1] % 256) / resolution);
                var x = Math.round((px[0] % 256) / resolution);
                x = x > 63 ? 63 : x;
                y = y > 63 ? 63 : y;
                var key, sx, sy;
                for (var i = 0; i < scan.length; i++) {
                    sx = x + scan[i][0];
                    sy = y + scan[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[resolveCode(grid.grid[sy].charCodeAt(sx))];
                    if (key) {
                        context[pos] = key && feature(key, type, grid.data[key]);
                        break;
                    }
                }
            }
            if (!--remaining) {
                context.reverse();
                return callback(null, context.filter(function(v) { return v; }));
            }
        }
        if (cache[ckey] && cache[ckey].open) {
            done(null, cache[ckey].data);
        } else if (cache[ckey]) {
            cache[ckey].once('open', done);
        } else {
            cache[ckey] = new Locking();
            source.getGrid(zoom, xyz.minX, xyz.minY, cache[ckey].loader(done));
        }
    }
};

// Retrieve the context for a feature (document).
Carmen.prototype.contextByFeature = function(data, callback) {
    if (!('lon' in data)) return callback(new Error('No lon field in data'));
    if (!('lat' in data)) return callback(new Error('No lat field in data'));
    var carmen = this;
    this.context(data.lon, data.lat, data.id.split('.')[0], function(err, context) {
        if (err) return callback(err);

        // Push feature onto the top level.
        context.unshift(data);
        return callback(null, context);
    });
};

// Return a "usage" relev by comparing a set of relevd elements against the
// input query. Each relevd element must include the following keys: relev,
// reason, db.
Carmen.usagerelev = function(query, relevd) {
    // Clone original query tokens. These will be crossed off one
    // by one to ensure each query token only counts once towards
    // the final relev.
    query = query.slice(0);

    var relev = 0;
    var total = query.length;
    var lastdb = false;

    for (var i = 0; i < relevd.length; i++) {
        if (lastdb === relevd[i].db) continue;

        var usage = 0;
        var reason = relevd[i].reason;
        for (var j = 0; j < query.length; j++) {
            if ((1<<j & reason) && query[j]) {
                ++usage;
                query[j] = false;
            }
        }
        if (usage) {
            relev += relevd[i].relev * (usage/total);
            lastdb = relevd[i].db;
        }
    }
    return relev;
};

// Search a carmen source for features matching query.
Carmen.prototype.search = function(source, query, id, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.search(source, query, id, callback);
        }.bind(this));
    }

    var idx = source._carmen.idx;
    var dbname = source._carmen.name;
    var terms = Carmen.terms(query);
    var weights = {}; // @TODO shared cache for this?
    var relevs = {};
    var stats = {
        degen:[0,0,0],
        phrase:[0,0,0],
        term:[0,0,0],
        relevd:[0,0,0],
        grid:[0,0,0]
    };

    var querymap = {};

    var getdegen = function(queue, result, idx, callback) {
        if (!queue[idx]) {
            stats.degen[2] = stats.degen[2] && (+new Date() - stats.degen[2]);
            stats.degen[1] = result.length;
            return callback(null, result);
        }

        stats.degen[0]++;
        stats.degen[2] = +new Date();

        var sorter = function(a, b) {
            var ad = a % 4;
            var bd = b % 4;
            if (ad < bd) return -1;
            if (ad > bd) return 1;
            return a < b ? -1 : a > b ? 1 : 0;
        };

        source._carmen.getall(source.getCarmen.bind(source), 'degen', [queue[idx]], function(err, termdist) {
            if (err) return callback(err);

            termdist.sort(sorter);
            var closest = [];
            var distance = termdist[0] % 4;
            for (var i = 0; i < termdist.length && i < 10; i++) {
                var term = Math.floor(termdist[i]/4);
                querymap[term] = [idx, termdist[i]%4];
                result.push(term);
            }

            return getdegen(queue, result, idx+1, callback);
        });
    };

    var getphrases = function(queue, callback) {
        stats.phrase[0]++;
        stats.phrase[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'term', queue, function(err, result) {
            if (err) return callback(err);
            stats.phrase[2] = stats.phrase[2] && (+new Date() - stats.phrase[2]);
            stats.phrase[1] = result.length;
            return callback(null, result);
        });
    };

    var getterms = function(queue, callback) {
        stats.term[0]++;
        stats.term[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'phrase', queue, function(err, result) {
            if (err) return callback(err);
            stats.term[2] = stats.term[2] && (+new Date() - stats.term[2]);
            stats.term[1] = result.length;
            return callback(null, result);
        });
    };

    var getfreqs = function(queue, callback) {
        queue.unshift(0);
        var total;
        source._carmen.getall(source.getCarmen.bind(source), 'freq', queue, function(err, result) {
            if (err) return callback(err);
            total = source._carmen.get('freq', 0)[0];
            for (var i = 0; i < queue.length; i++) {
                var id = queue[i];
                weights[id] = Math.log(1 + total/source._carmen.get('freq', id)[0]);
            }
            callback(null);
        });
    };

    var getrelevd = function(phrases, callback) {
        stats.relevd[2] = +new Date();
        var result = [];
        for (var a = 0; a < phrases.length; a++) {
            var id = phrases[a];
            var data = source._carmen.get('phrase', id);
            if (!data) throw new Error('Failed to get phrase');

            // relev each feature:
            // - across all feature synonyms, find the max relev of the sum
            //   of each synonym's terms based on each term's frequency of
            //   occurrence in the dataset.
            // - for the max relev also store the 'reason' -- the index of
            //   each query token that contributed to its relev.
            var term = 0;
            var relev = 0;
            var total = 0;
            var count = 0;
            var reason = 0;
            var termpos = -1;
            var lastpos = -1;
            var termdist = 0;
            var chardist = 0;
            var text = data;
            for (var i = 0; i < data.length; i++) {
                total += weights[data[i]];
            }

            if (total < 0) throw new Error('Bad freq total ' + total);

            for (i = 0; i < text.length; i++) {
                term = text[i];
                if (!querymap[term]) {
                    if (relev !== 0) {
                        break;
                    } else {
                        continue;
                    }
                }
                termpos = querymap[term][0];
                termdist = querymap[term][1];
                if (relev === 0 || termpos === lastpos + 1) {
                    relev += weights[term]/total;
                    reason += 1 << termpos;
                    chardist += termdist;
                    count++;
                    lastpos = termpos;
                }
            }
            // relev represents a score based on comparative term weight
            // significance alone. If it passes this threshold check it is
            // adjusted based on degenerate term character distance (e.g.
            // degens of higher distance reduce relev score).
            if (relev > 0.6) {
                result.push(id);
                relev = (relev > 0.99 ? 1 : relev) - (chardist * 0.01);
                relevs[id] = {
                    relev: relev,
                    reason: reason,
                    // encode relev, reason count together
                    tmprelev: relev * 1e6 + count
                };
            }
        }
        result.sort();
        result = _(result).uniq(true);
        stats.relevd[2] = +new Date() - stats.relevd[2];
        stats.relevd[1] = result.length;
        return result;
    };

    var docrelev = {};

    function getgrids(queue, callback) {
        stats.grid[0]++;
        stats.grid[2] = +new Date();

        source._carmen.getall(source.getCarmen.bind(source), 'grid', queue, function(err) {
            if (err) return callback(err);

            var idmod = Math.pow(2,25);
            var result = [];
            var features = {};
            for (var a = 0; a < queue.length; a++) {
                var id = queue[a];
                var relev = relevs[id];
                var grids = source._carmen.get('grid', id);
                for (var i = 0; i < grids.length; i++) {
                    var grid = grids[i];
                    var feat = grid % idmod;
                    if (!features[feat] || docrelev[feat] < relev.tmprelev) {
                        features[feat] = new Relev(feat, relev.relev, relev.reason, idx, dbname, idx * 1e14 + feat);
                        docrelev[feat] = relev.tmprelev;
                    }
                }
                result.push.apply(result, grids);
            }

            stats.grid[2] = stats.grid[2] && (+new Date() - stats.grid[2]);
            stats.grid[1] = result.length;
            return callback(null, features, result);
        });
    }

    getdegen(terms, [], 0, function(err, terms) {
        if (err) return callback(err);
        getphrases(terms, function(err, phrases) {
            if (err) return callback(err);
            getterms(phrases, function(err, terms) {
                if (err) return callback(err);
                getfreqs(terms, function(err) {
                    if (err) return callback(err);
                    var relevd = getrelevd(phrases);
                    getgrids(relevd, function(err, features, result) {
                        if (err) return callback(err);
                        return callback(null, features, result, stats);
                    });
                });
            });
        });
    });
};

// Add docs to a source's index.
Carmen.prototype.index = function(source, docs, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.index(source, docs, callback);
        }.bind(this));
    }

    indexFreqs(function(err, freq) {
        if (err) return callback(err);
        indexDocs(freq[0], freq, callback);
    });

    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.
    function indexFreqs(callback) {
        var remaining = 0;
        var freq = {};

        // Uses freq[0] as a convention for storing total # of docs.
        // @TODO determine whether 0 can really ever be a relevant term
        // when using fnv1a.
        freq[0] = [0];

        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            var phrases = [];
            var termsets = [];
            var termsmaps = [];
            var texts = doc.text.split(',');
            for (var x = 0; x < texts.length; x++) {
                if (!Carmen.tokenize(texts[x]).length) continue;
                phrases.push(Carmen.phrase(texts[x]));
                termsets.push(Carmen.terms(texts[x]));
                termsmaps.push(Carmen.termsMap(texts[x]));
            }
            for (var j = 0; j < termsets.length; j++) {
                var terms = termsets[j];
                for (var k = 0; k < terms.length; k++) {
                    var id = terms[k];
                    freq[id] = freq[id] || [0];
                    freq[id][0]++;
                    freq[0][0]++;
                }
            }
            doc.phrases = phrases;
            doc.termsets = termsets;
            doc.termsmaps = termsmaps;
        }

        // Ensures all shards are loaded.
        var ids = Object.keys(freq).map(function(v) { return parseInt(v,10); });
        source._carmen.getall(source.getCarmen.bind(source), 'freq', ids, function(err) {
            if (err) return callback(err);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                freq[id][0] = (source._carmen.get('freq', id) || [0])[0] + freq[id][0];
                source._carmen.set('freq', id, freq[id]);
            }
            callback(null, freq);
        });
    }

    // Second pass over docs.
    // - Create term => docid index. Uses calculated frequencies to index only
    //   significant terms for each document.
    // - Create id => grid zxy index.
    function indexDocs(approxdocs, freq, callback) {
        var patch = { grid:{}, term: {}, phrase:{}, degen:{} };
        var degenerated = {};

        docs.forEach(function(doc) {
            doc.id = parseInt(doc.id,10);
            doc.zxy = doc.zxy ? doc.zxy.map(function(zxy) {
                return Carmen.zxy(doc.id, zxy);
            }) : [];

            var phrases = doc.phrases;
            var termsets = doc.termsets;
            var termsmaps = doc.termsmaps;

            phrases.forEach(function(id, x) {
                patch.phrase[id] = patch.phrase[id] || termsets[x];
                patch.grid[id] = patch.grid[id] || [];
                patch.grid[id].push.apply(patch.grid[id], doc.zxy);
            });

            termsets.forEach(function(terms, x) {
                var id;
                var termsmap = termsmaps[x];
                var name = phrases[x];
                var weights = [];
                var total = 0;

                for (var i = 0; i < terms.length; i++) {
                    id = terms[i];
                    var weight = Math.log(1 + freq[0][0]/freq[id][0]);
                    weights.push([id, weight]);
                    total += weight;

                    // Degenerate terms are indexed for all terms
                    // (not just significant ones).
                    if (degenerated[id]) continue;
                    degenerated[id] = true;
                    var degens = Carmen.degens(termsmap[id]);
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
                var limit = Math.floor(Math.sqrt(weights.length));
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
            });
        });

        var remaining = docs.length;
        remaining++; // term
        remaining++; // phrase
        remaining++; // grid

        _(docs).each(function(doc) {
            source.putFeature(doc.id, doc.doc, function(err) {
                if (err && remaining > 0) {
                    remaining = -1;
                    return callback(err);
                }
                if (!--remaining) callback(null);
            });
        });

        _(patch).each(function(data, type) {
            var ids = Object.keys(data);
            source._carmen.getall(source.getCarmen.bind(source), type, ids, function(err) {
                if (err && remaining > 0) {
                    remaining = -1;
                    return callback(err);
                }
                for (var i = 0; i < ids.length; i++) {
                    var id = ids[i];
                    // This merges new entries on top of old ones.
                    switch (type) {
                    case 'term':
                    case 'grid':
                    case 'degen':
                        var current = source._carmen.get(type, id) || [];
                        current.push.apply(current, data[id]);
                        source._carmen.set(type, id, current);
                        break;
                    case 'phrase':
                        source._carmen.set(type, id, data[id]);
                        break;
                    }
                }
                if (!--remaining) callback(null);
            });
        });
    }
};

// Serialize and make permanent the index currently in memory for a source.
Carmen.prototype.store = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.store(source, callback);
        }.bind(this));
    }

    var queue = [];
    ['freq','term','phrase','grid','degen'].forEach(function(type) {
        queue = queue.concat(source._carmen.list(type).map(function(shard) {
            var ids = source._carmen.list(type, shard);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                switch (type) {
                case 'term':
                case 'grid':
                case 'degen':
                    var data = source._carmen.get(type, id);
                    data.sort();
                    source._carmen.set(type, id, _(data).uniq(true));
                    break;
                }
            }
            return [type, shard];
        }));
    });

    var write = function() {
        if (!queue.length) return callback();
        var task = queue.shift();
        var type = task[0];
        var shard = task[1];
        source.putCarmen(type, shard, source._carmen.pack(type, shard), function(err) {
            if (err) return callback(err);
            defer(function() { write(); });
        });
    };
    write();
};

// Normalize input text into lowercase, asciified tokens.
Carmen.tokenize = function(query, lonlat) {
    if (lonlat) {
        var numeric = query.
            split(/[^\.\-\d+]+/i)
            .filter(function(t) { return t.length; })
            .map(function(t) { return parseFloat(t); })
            .filter(function(t) { return !isNaN(t); });
        if (numeric.length === 2) return numeric;
    }

    try {
        var converted = iconv.convert(query).toString();
        query = converted;
    } catch(err) {}

    return query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        .replace(/[-,]+/g, ' ')
        .split(/[^\w+^\s+]/gi)
        .join('')
        .split(/[\s+]+/gi)
        .filter(function(t) { return t.length; });
};

// Generate degenerates from a given token.
Carmen.degens = function(token) {
    var length = token.length;
    var degens = {};
    for (var i = 0; !i || (i < length && length - i > 2); i++) {
        var degen = fnvfold(token.substr(0, length - i), 30);
        degens[degen] = (fnvfold(token, 30) * 4) + Math.min(i,3);
    }
    return degens;
};

// Converts text into an array of search term hash IDs.
Carmen.terms = function(text) {
    var tokens = Carmen.tokenize(text);
    for (var i = 0; i < tokens.length; i++) tokens[i] = fnvfold(tokens[i], 30);
    return tokens;
};

// Map terms to their original token.
Carmen.termsMap = function(text) {
    var tokens = Carmen.tokenize(text);
    var mapped = {};
    for (var i = 0; i < tokens.length; i++) mapped[fnvfold(tokens[i], 30)] = tokens[i];
    return mapped;
};

// Converts text into a name ID.
// Appends a suffix based on the first term to help cluster phrases in shards.
// @TODO implement this as actual 24-bit FNV1a per http://www.isthe.com/chongo/tech/comp/fnv/
Carmen.phrase = function(text) {
    var tokens = Carmen.tokenize(text);
    var a = fnvfold(tokens.join(' '), 20);
    var b = fnvfold((tokens.length ? tokens[0] : ''), 30) % 4096;
    return a * 4096 + b;
};

// Converts id + zxy coordinates into an array of zxy IDs.
// z is omitted as it can be derived from source maxzoom metadata.
// x and y are encoded as multiples of Math.pow(2,14) (making z14 the
// maximum zoom level) leaving Math.pow(2,25) distinct values for IDs.
Carmen.zxy = function(id, zxy) {
    zxy = zxy.split('/');
    return ((zxy[1]|0) * Math.pow(2,39)) + ((zxy[2]|0) * Math.pow(2,25)) + id;
};

// Generate a Carmen options hash automatically reading sources in a directory.
Carmen.autoSync = function(dirname) {
    var S3;
    var MBTiles;
    var dir = path.resolve(dirname);
    var files = fs.readdirSync(dir).map(function(f) {
        return {
            pathname: dir + '/' + f,
            extname: path.extname(f),
            prefix: f.split('.')[0],
            dbname: f.split('.')[1] || f.split('.')[0]
        };
    });
    files.sort(function(a, b) {
        return a.prefix < b.prefix ? -1 : a.prefix > b.prefix ? 1 : 0;
    });
    return files.reduce(function(opts, f) {
        switch (f.extname) {
        case '.mbtiles':
            MBTiles = MBTiles || Carmen.MBTiles();
            opts[f.dbname] = opts[f.dbname] || new MBTiles(f.pathname, function(){});
            break;
        case '.s3':
            S3 = S3 || Carmen.S3();
            opts[f.dbname] = opts[f.dbname] || new S3(f.pathname, function(){});
            break;
        }
        return opts;
    }, {});

};

module.exports = Carmen;

// Prototype for relevance relevd rows of Carmen.search.
// Defined to take advantage of V8 class performance.
function Relev(id, relev, reason, idx, db, tmpid) {
    this.id = id;
    this.relev = relev;
    this.reason = reason;
    this.idx = idx;
    this.db = db;
    this.tmpid = tmpid;
}
