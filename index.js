var _ = require('underscore');
var path = require('path');
var Step = require('step');
var basepath = path.resolve(__dirname + '/tiles');
var sm = new (require('sphericalmercator'))();
var crypto = require('crypto');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');

// For a given z,x,y find its parent tile.
function pyramid(zxy, parent) {
    var z = (zxy / 1e14) | 0;
    var x = ((zxy % 1e14) / 1e7) | 0;
    var y = zxy % 1e7;
    var depth = Math.max(z - parent, 0);
    var side = Math.pow(2, depth);
    return ((z - depth) * 1e14) + (Math.floor(x/side) * 1e7) + Math.floor(y/side);
};

// Resolve the UTF-8 encoding stored in grids to simple number values.
function resolveCode(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
};

function toChar(key) {
    key += 32;
    if (key >= 34) key++;
    if (key >= 92) key++;
    return String.fromCharCode(key);
};

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
};

require('util').inherits(Carmen, require('events').EventEmitter);

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

    this.indexes = _(options).reduce(function(memo, source, key) {
        // Legacy support.
        source = source.source ? source.source : source;

        memo[key] = source;
        source._carmen = source._carmen || { term: {}, grid: {} };
        if (source.open) {
            source.getInfo(function(err, info) {
                if (err) return done(err);
                source._carmen.zoom = info.maxzoom;
                source._carmen.shardlevel = info.shardlevel || 0;
                return done();
            });
        } else {
            source.once('open', function(err) {
                if (err) return done(err);
                source.getInfo(function(err, info) {
                    if (err) return done(err);
                    source._carmen.zoom = info.maxzoom;
                    source._carmen.shardlevel = info.shardlevel || 0;
                    return done();
                });
            });
        }
        return memo;
    }, {});
};

Carmen.S3 = function() { return require('./api-s3') };
Carmen.MBTiles = function() { return require('./api-mbtiles') };

Carmen.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

Carmen.prototype.context = function(lon, lat, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.context(lon, lat, callback);
    }.bind(this));

    var indexes = this.indexes;
    var carmen = this;
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

    Step(function() {
        var group = this.group();
        _(indexes).each(function(source, type) {
            var zoom = source._carmen.zoom;
            var xyz = sm.xyz([lon,lat,lon,lat], zoom);
            var next = group();
            source.getGrid(zoom, xyz.minX, xyz.minY, function(err, grid) {
                if (err) return next(err);

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
                    if (key) break;
                }

                if (!key) return next();

                var data = feature(key, type, grid.data[key]);
                if (!'lon' in data) return next(new Error('No lon field in data'));
                if (!'lat' in data) return next(new Error('No lat field in data'));
                return next(null, data);
            });
        });
    }, function(err, context) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        return callback(null, _(context).chain().compact().reverse().value());
    });
};

// Retrieve the context for a feature (document).
Carmen.prototype.contextByFeature = function(data, callback) {
    if (!'lon' in data) return callback(new Error('No lon field in data'));
    if (!'lat' in data) return callback(new Error('No lat field in data'));
    var carmen = this;
    this.context(data.lon, data.lat, function(err, context) {
        if (err) return callback(err);

        // Filter out levels that match or exceed the detail of the feature.
        var types = Object.keys(carmen.indexes);
        var index = types.indexOf(data.id.split('.')[0]);
        context = context.filter(function(c) {
            return types.indexOf(c.id.split('.')[0]) < index;
        });
        // Push feature onto the top level.
        context.unshift(data);
        return callback(null, context);
    });
};

Carmen.prototype.geocode = function(query, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.geocode(query, callback);
    }.bind(this));

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
        return this.context(data.query[0], data.query[1], function(err, context) {
            if (err) return callback(err);
            data.results = context.length ? [context] : [];
            return callback(null, data);
        });
    }

    // keyword search. Find matching features.
    data.stats.searchTime = +new Date;
    Step(function() {
        var group = this.group();
        _(indexes).each(function(source, dbname) {
            var next = group();
            carmen.search(source, data.query.join(' '), null, function(err, rows) {
                if (err) return next(err);
                if (rows.length) {
                    var z = rows[0].zxy[0]/1e14|0;
                    if (zooms.indexOf(z) === -1) zooms.push(z);
                }
                for (var j = 0, l = rows.length; j < l; j++) {
                    rows[j].db = dbname;
                    rows[j].tmpid = (types.indexOf(dbname) * 1e14 + rows[j].id);
                    rows[j].score = rows[j].score;
                    rows[j].reason = rows[j].reason;
                };
                next(null, rows);
            });
        });
    }, function(err, rows) {
        if (err) throw err;

        data.stats.searchTime = +new Date - data.stats.searchTime;
        data.stats.searchCount = _(rows).flatten().length;

        data.stats.scoreTime = +new Date;

        // Sort zooms.
        zooms = _(zooms).sortBy();

        var features = {};
        _(rows).chain().flatten().each(function(row) {
            features[row.tmpid] = row;
            features[row.db + '.' + row.id] = row;
        });

        var results = _(rows).chain()
            .flatten()
            // Coalesce scores into higher zooms, e.g.
            // z5 inherits score of overlapping tiles at z4.
            .reduce(function(memo, row) {
                var f = features[row.tmpid];
                for (var i = 0, l = row.zxy.length; i < l; i++) {
                    for (var j = 0, m = zooms.length; j < m; j++) {
                        var zxy = pyramid(row.zxy[i], zooms[j]);
                        memo[zxy] = memo[zxy] || [];
                        if (memo[zxy].indexOf(f) === -1) memo[zxy].push(f);
                    }
                }
                return memo;
            }, {})
            .reduce(function(memo, rows) {
                // Sort by db, score such that total score can be
                // calculated without results for the same db being summed.
                rows.sort(function(a, b) {
                    var ai = types.indexOf(a.db);
                    var bi = types.indexOf(b.db);
                    if (ai < bi) return -1;
                    if (ai > bi) return 1;
                    if (a.score > b.score) return -1;
                    if (a.score < b.score) return 1;
                    return 0;
                });

                var lastdb = '';
                var maxscore = 0;
                var query = [].concat(data.query);
                for (var i = 0, l = rows.length; i < l; i++) {
                    if (lastdb === rows[i].db) continue;
                    var hasreason = true;
                    var reason = rows[i].reason;
                    for (var j = 0; j < reason.length; j++) {
                        hasreason = hasreason && query[reason[j]];
                        query[reason[j]] = false;
                    }
                    if (hasreason) {
                        maxscore += rows[i].score;
                        lastdb = rows[i].db;
                    }
                }
                for (var i = 0, l = rows.length; i < l; i++) {
                    memo[rows[i].tmpid] = memo[rows[i].tmpid] || {
                        db: rows[i].db,
                        id: rows[i].id,
                        tmpid: rows[i].tmpid,
                        score: Math.max(rows[i].score, maxscore)
                    };
                }

                return memo;
            }, {})
            .reduce(function(memo, feature) {
                if (!memo.length || feature.score === memo[0].score) {
                    memo.push(feature);
                    return memo;
                } else if (feature.score > memo[0].score) {
                    return [feature];
                }
                return memo;
            }, [])
            .map(function(f) { return f.db + '.' + f.id; })
            .value();

        data.stats.scoreTime = +new Date - data.stats.scoreTime;
        data.stats.scoreCount = results.length;

        if (!results.length) return this(null, []);

        data.stats.contextTime = +new Date;

        // Not using this.group() here because somehow this
        // code triggers Step's group bug.
        var next = this;
        var matches = [];
        var contexts = [];
        var remaining = results.length;
        _(results).each(function(terms) {
            var term = terms.split(',')[0];
            var termid = term.split('.')[1];
            var dbname = term.split('.')[0];
            indexes[dbname].getFeature(termid, function(err, data) {
                if (err) return next(err);
                carmen.contextByFeature(feature(termid, dbname, data), function(err, context) {
                    if (err) return next(err);
                    contexts.push(context);
                    if (--remaining === 0) return next(null, contexts, features);
                });
            });
        });
    }, function(err, contexts, features) {
        if (err) return callback(err);

        // Confirm that the context contains the terms that contributed
        // to the match's score. All other contexts are false positives
        // and should be discarded. Example:
        //
        //     "Chester, NJ" => "Chester, PA"
        //
        // This context will be returned because Chester, PA is in
        // close enough proximity to overlap with NJ.
        var maxscore = 0;
        var results = _(contexts).reduce(function(memo, c) {
            // Clone original query tokens. These will be crossed off one
            // by one to ensure each query token only counts once towards
            // the final score.
            var query = [].concat(data.query);
            // Score for this context. Each context element that is amongst
            // features found by the initial search contribute to its score.
            var score = 0;
            // Count the number of original query tokens that contribute
            // to the final score.
            var usage = 0;
            for (var i = 0; i < c.length; i++) {
                if (features[c[i].id]) {
                    var hasreason = true;
                    var reason = features[c[i].id].reason;
                    for (var j = 0; j < reason.length; j++) {
                        hasreason = hasreason && query[reason[j]] && ++usage;
                        query[reason[j]] = false;
                    }
                    if (hasreason) score += features[c[i].id].score;
                }
            }
            score = score * (usage / data.query.length);

            if (!memo.length || score === maxscore) {
                memo.push(c);
                maxscore = score;
                return memo;
            } else if (score > maxscore) {
                maxscore = score;
                return [c];
            } else {
                return memo;
            }
        }, []);

        data.results = results;
        data.stats.score = maxscore;

        data.results.sort(function(a, b) {
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
        data.stats.contextTime = +new Date - data.stats.contextTime;
        data.stats.contextCount = contexts.length;

        return callback(null, data);
    });
};

Carmen.prototype.search = function(source, query, id, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.search(source, query, id, callback);
    }.bind(this));

    var approxdocs = 0;
    var shardlevel = source._carmen.shardlevel;
    var terms = Carmen.terms(query);
    var freqs = {};

    var getids = function(queue, result, callback) {
        if (!queue.length) return callback(null, _(result).uniq());

        var term = queue.shift();
        var shard = Carmen.shard(shardlevel, term);
        source.getCarmen('term', shard, function(err, data) {
            if (err) return callback(err);

            // Calculate approx doc count once.
            if (!approxdocs) approxdocs = Object.keys(data).length * Math.pow(16, shardlevel);

            result = result.concat(data[term]);
            freqs[term] = data[term] ? Math.log(approxdocs / data[term].length) : 0;
            getids(queue, result, callback);
        });
    };

    var getzxy = function(queue, result, callback) {
        if (!queue.length) return callback(null, result);

        var id = queue.shift();
        var shard = Carmen.shard(shardlevel, id);

        source.getCarmen('grid', shard, function(err, data) {
            if (err) return callback(err);
            if (!data[id]) return getzxy(queue, result, callback);

            termfreq(Array.prototype.concat.apply([], data[id].text), function(err) {
                if (err) return callback(err);

                // Score each feature:
                // - across all feature synonyms, find the max score of the sum
                //   of each synonym's terms based on each term's frequency of
                //   occurrence in the dataset.
                // - for the max score also store the 'reason' -- the index of
                //   each query token that contributed to its score.
                var score = 0;
                var reason = [];
                for (var i = 0; i < data[id].text.length; i++) {
                    var total = 0;
                    var localScore = 0;
                    var localReason = [];
                    var text = data[id].text[i];

                    for (var j = 0; j < text.length; j++) {
                        total += freqs[text[j]];
                    }
                    for (var j = 0; j < terms.length; j++) {
                        if (text.indexOf(terms[j]) !== -1 && localReason.indexOf(j) === -1) {
                            localScore += freqs[terms[j]]/total;
                            localReason.push(j);
                        }
                    }
                    if (localScore > score) {
                        score = localScore;
                        reason = localReason;
                    }
                }

                if (score > 0.9) result.push({
                    id: id,
                    // patch up javascript float precision errors -- scores
                    // that should add to 1 sometimes come back as 0.99999...
                    score: score > 0.9999 ? 1 : score,
                    reason: reason,
                    zxy: data[id].zxy
                });
                getzxy(queue, result, callback);
            });
        });
    };

    var termfreq = function(terms, callback) {
        if (!terms.length) return callback();
        var term = terms.shift();

        // Term frequency is already known. Continue.
        if (freqs[term]) return termfreq(terms, callback);

        // Look up term frequency.
        var shard = Carmen.shard(shardlevel, term);
        source.getCarmen('term', shard, function(err, data) {
            if (err) return callback(err);
            freqs[term] = Math.log(approxdocs / data[term].length);
            return termfreq(terms, callback);
        });
    };

    getids([].concat(terms), [], function(err, ids) {
        if (err) return callback(err);
        getzxy(ids, [], callback);
    });
};

// Implements carmen#index method.
Carmen.prototype.index = function(source, docs, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.index(source, docs, callback);
    }.bind(this));

    var shardlevel = source._carmen.shardlevel;
    var remaining = docs.length;
    var patch = { term: {}, grid: {} };
    var done = function(err) {
        if (err) {
            remaining = -1;
            callback(err);
        } else if (!--remaining) {
            callback(null);
        }
    };
    docs.forEach(function(doc) {
        var docid = doc.id|0;
        Carmen.terms(doc.text).reduce(function(memo, id) {
            var shard = Carmen.shard(shardlevel, id);
            memo[shard] = memo[shard] || {};
            memo[shard][id] = memo[shard][id] || [];
            memo[shard][id].push(docid);
            return memo;
        }, patch.term);
        var shard = Carmen.shard(shardlevel, docid);
        patch.grid[shard] = patch.grid[shard] || {};
        patch.grid[shard][docid] = {
            text: doc.text.split(',').map(Carmen.terms),
            zxy: doc.zxy.map(Carmen.zxy)
        };
    });
    // Number of term shards.
    remaining += Object.keys(patch.term).length;
    // Number of grid shards.
    remaining += Object.keys(patch.grid).length;
    // Add each doc.
    docs.forEach(function(doc) {
        source.putFeature(doc.id, doc.doc, done);
    });
    _(patch).each(function(shards, type) {
        _(shards).each(function(data, shard) {
            source.getCarmen(type, shard, function(err, current) {
                switch (type) {
                case 'term':
                    // This merges new entries on top of old ones.
                    // @TODO invalidate old entries in a separate command/op.
                    _(data).each(function(val, key) {
                        current[key] = current[key] || [];
                        current[key] = _(current[key].concat(val)).uniq();
                    });
                    break;
                case 'grid':
                    _(data).each(function(val, key) { current[key] = val });
                    break;
                }
                source.putCarmen(type, shard, current, done);
            });
        });
    });
};

Carmen.tokenize = function(query, lonlat) {
    if (lonlat) {
        var numeric = query.
            split(/[^\.\-\d+]+/i)
            .filter(function(t) { return t.length })
            .map(function(t) { return parseFloat(t) })
            .filter(function(t) { return !isNaN(t) });
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
        .filter(function(t) { return t.length });
};

// Converts text into an array of search term hash IDs.
Carmen.terms = function(text) {
    var terms = Carmen.tokenize(text).map(function(w) {
        return parseInt(crypto.createHash('md5').update(w).digest('hex').substr(0,8), 16);
    });
    return _(terms).uniq();
};

// Assumes an integer space of Math.pow(16,8);
Carmen.shard = function(level, id) {
    if (level === 0) return 0;
    return id % Math.pow(16, level);
};

// Converts zxy coordinates into an array of zxy IDs.
Carmen.zxy = function(zxy) {
    zxy = zxy.split('/');
    return ((zxy[0]|0) * 1e14) + ((zxy[1]|0) * 1e7) + (zxy[2]|0);
};

// Return an array of values with the highest frequency from the original array.
Carmen.mostfreq = function(list) {
    if (!list.length) return [];
    list.sort();
    var values = [];
    var maxfreq = 1;
    var curfreq = 1;
    do {
        var current = list.shift();
        if (current === list[0]) {
            curfreq++;
            if (curfreq > maxfreq) {
                maxfreq = curfreq;
                values = [current];
            } else if (curfreq === maxfreq && values.indexOf(current) === -1) {
                values.push(current);
            }
        } else if (maxfreq === 1) {
            values.push(current);
            curfreq = 1;
        } else {
            curfreq = 1;
        }
    } while (list.length);
    return values;
};

module.exports = Carmen;

