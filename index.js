var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Step = require('step');
var basepath = path.resolve(__dirname + '/tiles');
var sm = new (require('sphericalmercator'))();
var crypto = require('crypto');

// Split on a specified delimiter but retain it as a suffix in the parts,
// e.g. "foo st washington dc", "st" => ["foo st", "washington dc"]
function keepsplit(str, delim) {
    var rev = function(str) {
        return str.split('').reverse().join('');
    };
    return rev(str)
        .split(new RegExp('\\s(?=' + delim
            .map(rev)
            .map(function(s) { return s + '\\s' })
            .join('|')  + ')', 'i'))
        .map(rev)
        .reverse();
};

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

function Carmen(options) {
    if (!options) throw new Error('Carmen options required.');
    this.indexes = _(options).reduce(function(memo, db, key) {
        var dbname = key;
        memo[key] = _(db).defaults({
            context: true,
            query: true,
            weight: 1,
            sortBy: function(data) { return data.score || 0 },
            filter: function(token) { return true },
            map: function(data) {
                delete data.search;
                delete data.rank;
                data.type = data.type || dbname;
                if (data.bounds) data.bounds = data.bounds.split(',').map(parseFloat);
                return data;
            }
        });
        return memo;
    }, {});
};

Carmen.S3 = function() { return require('./api-s3') };
Carmen.MBTiles = function() { return require('./api-mbtiles') };

Carmen.prototype._open = function(callback) {
    if (!_(this.indexes).all(function(d) { return d.source.open }))
        return callback(new Error('DB not open.'));

    if (this._opened) return callback();

    var carmen = this;
    var remaining = _(this.indexes).size();
    _(this.indexes).each(function(db) {
        db.source.getInfo(function(err, info) {
            if (info) db.zoom = info.maxzoom;
            if (err) {
                remaining = -1
                return callback(err);
            }
            if (--remaining === 0) {
                carmen.zooms = _(carmen.indexes).chain()
                    .pluck('zoom')
                    .uniq()
                    .sortBy(function(z) { return z })
                    .value();
                carmen._opened = true;
                return callback();
            }
        });
    });
};

Carmen.prototype.tokenize = function(query) {
    var numeric = query.
        split(/[^\.\-\d+]+/i)
        .filter(function(t) { return t.length })
        .map(function(t) { return parseFloat(t) })
        .filter(function(t) { return !isNaN(t) });

    // lon, lat pair.
    if (numeric.length === 2) return numeric;

    return query
        .toLowerCase()
        .split(/[^\w+]+/i)
        .filter(function(t) { return t.length });
};

Carmen.prototype.context = function(lon, lat, callback) {
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
        carmen._open(this);
    }, function(err) {
        if (err) return callback(err);

        var group = this.group();
        _(indexes).each(function(d, type) {
            if (!d.context) return;
            var xyz = sm.xyz([lon,lat,lon,lat], d.zoom);
            var next = group();
            d.source.getGrid(d.zoom, xyz.minX, xyz.minY, function(err, grid) {
                if (err) return next(err);

                var resolution = 4;
                var px = sm.px([lon,lat], d.zoom);
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

                var data = d.map(grid.data[key]);
                data.id = data.id || type + '.' + key;
                if ('lon' in data && 'lat' in data) return next(null, data);
                carmen.centroid(type + '.' + key, function(err, lonlat) {
                    if (err) return next(err);
                    data.lon = lonlat[0];
                    data.lat = lonlat[1];
                    return next(null, data);
                });

            });
        });
    }, function(err, context) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        return callback(null, _(context).chain().compact().reverse().value());
    });
};

// Retrieve the context for a feature given its id in the form [type].[id].
Carmen.prototype.contextByFeature = function(id, callback) {
    this.centroid(id, function(err, lonlat) {
        if (err) return callback(err);
        this.context(lonlat[0], lonlat[1], callback);
    }.bind(this));
};

// Get the [lon,lat] of a feature given its id in the form [type].[id].
// Looks up a point in the feature geometry using a point from a central grid.
Carmen.prototype.centroid = function(id, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.centroid(id, callback);
    }.bind(this));

    var type = id.split('.').shift();
    var id = id.split('.').pop();
    var carmen = this;
    var indexes = this.indexes;
    var c = {};

    Step(function() {
        indexes[type].source.search(null, id, this);
    }, function(err, row) {
        if (err) throw err;
        if (!row || !row.length) return this();
        row = row.shift();
        var rows = row.zxy.map(function(zxy) {
            zxy = zxy.split('/');
            return _({
                z: zxy[0] | 0,
                x: zxy[1] | 0,
                y: (Math.pow(2,zxy[0]|0) - zxy[2] - 1) | 0
            }).defaults(row);
        });
        c.z = rows[0].z;
        c.x = _(rows).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.y = _(rows).chain()
            .filter(function(row) { return row.x === c.x })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        indexes[type].source.getGrid(c.z,c.x,c.y,this);
    }, function(err, grid) {
        if (err) return callback(err);
        if (!grid) return callback(new Error('Grid does not exist'));

        var chr = toChar(grid.keys.indexOf(id));
        var xy = [];
        _(grid.grid).each(function(row, y) {
            if (row.indexOf(chr) === -1) return;
            for (var x = 0; x < 64; x++) if (row[x] === chr) xy.push({x:x,y:y});
        });
        c.px = _(xy).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.py = _(xy).chain()
            .filter(function(xy) { return xy.x === c.px })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        callback(null, sm.ll([
            (256*c.x) + (c.px*4),
            (256*c.y) + (c.py*4)
        ], c.z));
    });
};

Carmen.prototype.geocode = function(query, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.geocode(query, callback);
    }.bind(this));

    var indexes = this.indexes;
    var zooms = this.zooms;
    var types = Object.keys(indexes);
    var data = {
        query: this.tokenize(query),
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
        _(indexes).each(function(db, dbname) {
            var next = group();
            db.source.search(data.query.join(' '), null, function(err, rows) {
                if (err) return next(err);
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
            indexes[dbname].source.feature(termid, function(err, data) {
                if (err) return next(err);
                var r = {};
                r.id = dbname + '.' + termid;
                r.type = dbname;
                r.data = data;
                r.data.id = r.data.id || r.id;
                r.terms = terms.split(',');

                var args = [r.id];
                var method = 'contextByFeature';
                if ('lon' in r.data && 'lat' in r.data) {
                    args = [r.data.lon, r.data.lat];
                    method = 'context';
                }
                carmen[method].apply(carmen, args.concat(function(err, context) {
                    if (err) return next(err);
                    // Add the result in manually for indexes that exclude context retrieval.
                    if (!indexes[r.type].context) context.unshift(indexes[r.type].map(r.data));
                    // Context adjustments.
                    context = _(context).chain().map(function(term) {
                        // Term matches result.
                        if (term.id === r.id) return term;
                        // Term is parent of result.
                        if (types.indexOf(term.id.split('.')[0]) < types.indexOf(r.type))
                            return term;
                        // A context that includes a different term at the
                        // same level as the result likely has a different
                        // overlapping feature that obscures the result
                        // feature. Replace the obscuring feature with the
                        // result.
                        if (types.indexOf(term.id.split('.')[0]) === types.indexOf(r.type))
                            return indexes[r.type].map(r.data);
                        return false;
                    }).compact().value();
                    contexts.push(context);
                    if (--remaining === 0) return next(null, contexts, features);
                }));
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
        data.results = _(contexts).chain()
            .reduce(function(memo, c) {
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

                if (!memo.length || score === memo[0][1]) {
                    memo.push([c, score]);
                    return memo;
                } else if (score > memo[0][1]) {
                    return [[c, score]];
                } else {
                    return memo;
                }
            }, [])
            .pluck('0')
            .value();

        data.results.sort(function(a, b) {
            a = a[0], b = b[0];

            // primary sort by result's index.
            var adb = a.id.split('.')[0];
            var bdb = b.id.split('.')[0];
            var ai = types.indexOf(adb);
            var bi = types.indexOf(bdb);
            if (ai < bi) return -1;
            if (ai > bi) return 1;

            // secondary sort by index sortBy callback.
            var as = indexes[adb].sortBy(a);
            var bs = indexes[bdb].sortBy(b);
            if (as > bs) return -1;
            if (as < bs) return 1;
            return 0;
        });
        data.stats.contextTime = +new Date - data.stats.contextTime;
        data.stats.contextCount = contexts.length;

        return callback(null, data);
    });
};

module.exports = Carmen;

