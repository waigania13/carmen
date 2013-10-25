var _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    sm = new (require('sphericalmercator'))(),
    crypto = require('crypto'),
    iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE'),
    EventEmitter = require('events').EventEmitter;

var Cache = require('./lib/cxxcache'),
    Relev = require('./lib/relev'),
    usagerelev = require('./lib/usagerelev'),
    fnv = require('./lib/fnv'),
    Locking = require('./lib/locking'),
    termops = require('./lib/termops'),
    write = require('./lib/write'),
    ops = require('./lib/ops');

var defer = typeof setImmediate === 'undefined' ? process.nextTick : setImmediate,
    lockingCache = {},
    DEBUG = process.env.DEBUG;

// Not only do we scan the exact point matched by a latitude, longitude
// pair, we also hit the 8 points that surround it as a rectangle.
var scanDirections = [
    [-1,1], [-1,0], [-1,-1],
    [0,-1], [0, 0], [0, 1],
    [1,-1], [1, 0], [1, 1]
];

require('util').inherits(Carmen, EventEmitter);
module.exports = Carmen;

// Initialize and load Carmen, with a selection of indexes.
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
            source.getInfo(loadedinfo);
        } else {
            source.once('open', opened);
        }
        return memo;

        function loadedinfo(err, info) {
            if (err) return done(err);
            source._carmen = source._carmen || new Cache(key, info.shardlevel || 0);
            source._carmen.zoom = info.maxzoom;
            source._carmen.name = key;
            source._carmen.idx = Object.keys(options).indexOf(key);
            return done();
        }

        function opened(err) {
            if (err) return done(err);
            source.getInfo(function(err, info) {
                if (err) return done(err);
                source._carmen = source._carmen || new Cache(key, +info.shardlevel || 0);
                source._carmen.zoom = info.maxzoom;
                source._carmen.name = key;
                source._carmen.idx = Object.keys(options).indexOf(key);
                return done();
            });
        }
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
//
// Actual searches are delegated to `Carmen.prototype.search` over each
// enabled backend.
//
// `query` is a string of text, like "Chester, NJ"
// `callback` is called with (error, results)
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
    var queryData = {
        query: termops.tokenize(query, true),
        stats: {}
    };
    var carmen = this;

    // lon,lat pair. Provide the context for this location.
    if (queryData.query.length === 2 && _(queryData.query).all(_.isNumber)) {
        return this.context(queryData.query[0], queryData.query[1], null, function(err, context) {
            if (err) return callback(err);
            queryData.results = context.length ? [context] : [];
            return callback(null, queryData);
        });
    }

    // keyword search. Find matching features.
    queryData.stats.searchTime = +new Date();

    // search runs `carmen.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    search(types, queryData, searchComplete);

    function search(types, data, callback) {
        var feats = [],
            grids = [],
            remaining = types.length;

        types.forEach(function(dbname, pos) {
            carmen.search(indexes[dbname], data.query.join(' '), null, searchLoaded);

            function searchLoaded(err, feat, grid, stats) {
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
                    zooms = zooms.sort(sortNumeric);
                    data.stats.searchTime = +new Date() - data.stats.searchTime;
                    data.stats.searchCount = _(grids).reduce(function(sum, v) {
                        return sum + v.length;
                    }, 0);
                    data.stats.relevTime = +new Date();
                    callback(null, feats, grids, zooms);
                }
            }
        });
    }

    function searchComplete(err, feats, grids, zooms) {
        if (err) return callback(err);
        relev(indexes, types, queryData, carmen, feats, grids, zooms, function(err, contexts, relevd) {
            if (err) return callback(err);

            var maxrelev = 0;
            contexts.sort(sortRelev);
            queryData.results = contexts;
            queryData.stats.relev = maxrelev;
            return callback(null, queryData);

            function sortRelev(a, b) {
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
                var arelev = usagerelev(queryData.query, ac);
                var brelev = usagerelev(queryData.query, bc);
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
            }
        });
    }
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

    types.forEach(loadType);

    function loadType(type, pos) {
        var source = indexes[type];
        var zoom = source._carmen.zoom;
        // Find the potential tile in which a match would occur, and look
        // it up in the cache.
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
                // calculate the pixel within the tile that we're looking for,
                // as an index into UTFGrid data.
                var px = sm.px([lon,lat], zoom);
                var y = Math.round((px[1] % 256) / resolution);
                var x = Math.round((px[0] % 256) / resolution);
                x = x > 63 ? 63 : x;
                y = y > 63 ? 63 : y;
                var key, sx, sy;
                // Check both the pixel itself and the 8 surrounding directions
                for (var i = 0; i < scanDirections.length; i++) {
                    sx = x + scanDirections[i][0];
                    sy = y + scanDirections[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[ops.resolveCode(grid.grid[sy].charCodeAt(sx))];
                    if (key) {
                        context[pos] = feature(key, type, grid.data[key]);
                        break;
                    }
                }
            }
            if (!--remaining) {
                context.reverse();
                return callback(null, context.filter(identity));
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
    this.context(data.lon, data.lat, data.id.split('.')[0], function(err, context) {
        if (err) return callback(err);

        // Push feature onto the top level.
        context.unshift(data);
        return callback(null, context);
    });
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
    var terms = termops.terms(query);
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

    function getdegen(queue, result, idx, callback) {
        if (!queue[idx]) {
            stats.degen[2] = stats.degen[2] && (+new Date() - stats.degen[2]);
            stats.degen[1] = result.length;
            return callback(null, result);
        }

        stats.degen[0]++;
        stats.degen[2] = +new Date();

        source._carmen.getall(source.getCarmen.bind(source), 'degen', [queue[idx]], mapTerms);

        function mapTerms(err, termdist) {
            if (err) return callback(err);

            termdist.sort(ops.sortMod4);

            for (var i = 0; i < termdist.length && i < 10; i++) {
                var term = Math.floor(termdist[i]/4);
                querymap[term] = [idx, termdist[i]%4];
                result.push(term);
            }

            return getdegen(queue, result, idx+1, callback);
        }
    }

    function getphrases(queue, callback) {
        stats.phrase[0]++;
        stats.phrase[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'term', queue, function(err, result) {
            if (err) return callback(err);
            stats.phrase[2] = stats.phrase[2] && (+new Date() - stats.phrase[2]);
            stats.phrase[1] = result.length;
            return callback(null, result);
        });
    }

    function getterms(queue, callback) {
        stats.term[0]++;
        stats.term[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'phrase', queue, function(err, result) {
            if (err) return callback(err);
            stats.term[2] = stats.term[2] && (+new Date() - stats.term[2]);
            stats.term[1] = result.length;
            return callback(null, result);
        });
    }

    function getfreqs(queue, callback) {
        queue.unshift(0);
        var total;
        source._carmen.getall(source.getCarmen.bind(source), 'freq', queue, function(err) {
            if (err) return callback(err);
            total = source._carmen.get('freq', 0)[0];
            for (var i = 0; i < queue.length; i++) {
                var id = queue[i];
                weights[id] = Math.log(1 + total/source._carmen.get('freq', id)[0]);
            }
            callback(null);
        });
    }

    function getrelevd(phrases) {
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
    }

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
    return write.index(source, docs, callback);
};

// Serialize and make permanent the index currently in memory for a source.
Carmen.prototype.store = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            this.store(source, callback);
        }.bind(this));
    }
    return write.store(source, callback);
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
    files.sort(sortByPrefix);
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

function sortByPrefix(a, b) {
    return a.prefix < b.prefix ? -1 : a.prefix > b.prefix ? 1 : 0;
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

// Given that we've geocoded potential results in multiple sources, given
// arrays of `feats` and `grids` of the same length, combine matches that
// are over the same point, factoring in the zoom levels on which they
// occur.
// Calls `callback` with `(err, contexts, relevd)` in which
//
// `contexts` is an array of bboxes which are assigned scores
// `relevd` which is an object mapping place ids to places
function relev(indexes, types, data, carmen, feats, grids, zooms, callback) {

    var relevd = {};
    var coalesced = {};
    var i, j, c;

    // Coalesce relevs into higher zooms, e.g.
    // z5 inherits relev of overlapping tiles at z4.
    // @TODO assumes sources are in zoom ascending order.
    var xd = Math.pow(2, 39),
        yd = Math.pow(2, 25),
        mp2_14 = Math.pow(2, 14),
        mp2_28 = Math.pow(2, 28);

    var h, grid, feat, x, y, p, s, pxy, a, zxy, f, z;
    for (h = 0; h < grids.length; h++) {
        grid = grids[h];
        feat = feats[h];
        z = indexes[types[h]]._carmen.zoom;
        for (i = 0; i < grid.length; i++) {
            f = feat[grid[i] % yd];
            if (!f) continue;
            x = Math.floor(grid[i]/xd);
            y = Math.floor(grid[i]%xd/yd);
            zxy = (z * mp2_28) + (x * mp2_14) + y;
            // @TODO this is an optimization that  assumes multiple
            // DBs do not use the same zoom level.
            if (!coalesced[zxy]) coalesced[zxy] = [f];
            a = 0;
            while (zooms[a] < z) {
                p = zooms[a];
                s = 1 << (z-p);
                pxy = (p * mp2_28) + (Math.floor(x/s) * mp2_14) + Math.floor(y/s);
                if (coalesced[pxy]) coalesced[zxy].push.apply(coalesced[zxy],coalesced[pxy]);
                a++;
            }
        }
    }

    var rowMemo = {}, rows, relev, fullid;
    for (c in coalesced) {
        rows = coalesced[c];
        // Sort by db, relev such that total relev can be
        // calculated without results for the same db being summed.
        rows.sort(sortRelevReason);
        relev = usagerelev(data.query, rows);
        for (i = 0, l = rows.length; i < l; i++) {
            fullid = rows[i].db + '.' + rows[i].id;
            relevd[fullid] = relevd[fullid] || rows[i];
            rowMemo[rows[i].tmpid] = rowMemo[rows[i].tmpid] || {
                db: rows[i].db,
                id: rows[i].id,
                tmpid: rows[i].tmpid,
                relev: relev
            };
        }
    }

    // A threshold here reduces results early.
    // @TODO tune this.
    // if (relev < 0.75) return memo;
    function sortRelevReason(a, b) {
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
    }

    var results = [];
    for (j in rowMemo) {
        results.push(rowMemo[j]);
    }

    results.sort(sortByRelev);

    var formatted = [];
    results = results.reduce(function(memo, feature) {
        if (!memo.length || memo[0].relev - feature.relev < 0.5) {
            memo.push(feature);
            formatted.push(feature.db + '.' + feature.id);
        }
        return memo;
    }, []);
    results = formatted;

    data.stats.relevTime = +new Date() - data.stats.relevTime;
    data.stats.relevCount = results.length;

    if (!results.length) return callback(null, results);

    // Disallow more than 50 of the best results at this point.
    if (results.length > 50) results = results.slice(0,50);

    var start = +new Date();
    var contexts = [];
    var remaining = results.length;
    // This function should be optimized away from `forEach`, but relies
    // on scope to deal with possibly async callbacks in `getFeature`
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

function sortByRelev(a, b) {
    return a.relev > b.relev ? -1 :
        a.relev < b.relev ? 1 :
        a.tmpid < b.tmpid ? -1 :
        a.tmpid > b.tmpid ? 1 : 0;
}

function identity(v) { return v; }
function sortNumeric(a,b) { return a < b ? -1 : 1; }
