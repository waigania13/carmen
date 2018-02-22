/* eslint no-process-exit: "off" */
'use strict';

const EventEmitter = require('events').EventEmitter;
const queue = require('d3-queue').queue;
const fs = require('fs');
const crypto = require('crypto');

const dawgcache = require('./lib/util/dawg');
const cxxcache = require('./lib/util/cxxcache');
const getContext = require('./lib/context');
const loader = require('./lib/loader');
const geocode = require('./lib/geocode');
const analyze = require('./lib/analyze');
const token = require('./lib/util/token');
const copy = require('./lib/copy');
const index = require('./lib/index');
const merge = require('./lib/merge');

require('util').inherits(Geocoder, EventEmitter);
module.exports = Geocoder;

/**
 * Geocoder is an interface used to submit a single query to
 * multiple indexes, returning a single set of ranked results.
 *
 * @access public
 *
 * @param {Object<string, Tilesource>} indexes - A one-to-one mapping from index layer name to [Tilesource](https://github.com/mapbox/tilelive/blob/master/API.md)
 * @param {Object} options - options
 * @param {Object<string, string>} options.tokens - mapping from string patterns to strings. patterns are replaced with strings when found in queries. helpful for abbreviations, eg. "Streets" => "St"
 * @param {Object<string, (string|Function)>} options.geocoder_inverse_tokens - for reversing abbreviations. Replace key with a stipulated string value or pass it to a function that returns a string. see [text-processsing](./text-processing.md) for details.
 *
 */
function Geocoder(indexes, options) {
    if (!indexes) throw new Error('Geocoder indexes required.');
    options = options || {};

    const q = queue(10);

    this.indexes = indexes;

    const globalTokens = options.tokens || {};
    if (typeof globalTokens !== 'object') throw new Error('globalTokens must be an object');

    this.replacer = token.createGlobalReplacer(globalTokens);

    this.globaltokens = options.tokens;
    this.byname = {};
    this.bytype = {};
    this.bysubtype = {};
    this.bystack = {};
    this.byidx = [];
    const names = [];

    // Cloning each index. Below, many of the properties on the source object are
    // set due to the configuration of the Geocoder instance itself. Cloning
    // allows us to re-use a given source across multiple Geocoder instances,
    // setting these properties differently for each clone.
    for (const k in indexes) {
        indexes[k] = clone(indexes[k]);
        q.defer(loadIndex, k, indexes[k]);
    }

    q.awaitAll((err, results) => {
        if (results) results.forEach(activateIndex, this);

        // Second pass -- generate bmask (geocoder_stack) per index.
        // The bmask of an index represents a mask of all indexes that their
        // geocoder_stacks do not intersect with -- ie. a spatialmatch with any of
        // these indexes should not be attempted as it will fail anyway.
        for (let i = 0; i < this.byidx.length; i++) {
            const bmask = [];
            const a = this.byidx[i];
            for (let j = 0; j < this.byidx.length; j++) {
                const b = this.byidx[j];
                let a_it = a.stack.length;
                while (a_it--) {
                    let b_it = b.stack.length;
                    while (b_it--) {
                        if (a.stack[a_it] === b.stack[b_it]) {
                            bmask[j] = 0;
                        } else if (bmask[j] !== 0) {
                            bmask[j] = 1;
                        }
                    }
                }
            }
            this.byidx[i].bmask = bmask;
        }

        this._opened = true;

        // emit the open event in a setImmediate -- circumstances exist
        // where no async ops may be necessary to construct a carmen,
        // in which case callers may not have a chance to register a callback handler
        // before open is emitted if we don't protect it this way
        const _this = this;
        setImmediate(() => {
            _this.emit('open', err);
        });

    });

    /**
     * Activates a single index in the geocoder. This function operates on the
     * output of {@link loadIndex}, which provides information needed for
     * activation.
     *
     * @access private
     *
     * @param {Object} data - data obtained via {@link loadIndex}
     * @param {int} i - index number
     */
    function activateIndex(data, i) {
        const id = data.id;
        const info = data.info;
        const dictcache = data.dictcache;
        const source = indexes[id];
        const name = info.geocoder_name || id;
        const type = info.geocoder_type || info.geocoder_name || id.replace('.mbtiles', '');
        const types = info.geocoder_types || [type];
        let stack = info.geocoder_stack || false;
        const languages = info.geocoder_languages || [];
        if (typeof stack === 'string') stack = [stack];
        const scoreRangeKeys = info.scoreranges ? Object.keys(info.scoreranges) : [];

        let err;

        if (names.indexOf(name) === -1) names.push(name);

        source._dictcache = source._original._dictcache || dictcache;

        if (!(source._original._geocoder && Object.keys(source._original._geocoder).length)) {
            source._geocoder = {
                freq: (data.freq && fs.existsSync(data.freq)) ?
                    new cxxcache.RocksDBCache(name + '.freq', data.freq) :
                    new cxxcache.MemoryCache(name + '.freq'),
                grid: (data.grid && fs.existsSync(data.grid)) ?
                    new cxxcache.RocksDBCache(name + '.grid', data.grid) :
                    new cxxcache.MemoryCache(name + '.grid')
            };
        } else {
            source._geocoder = source._original._geocoder;
        }

        // Set references to _geocoder, _dictcache on original source to
        // avoid duplication if it's loaded again.
        source._original._geocoder = source._geocoder;
        source._original._dictcache = source._dictcache;

        if (info.geocoder_address) {
            source.geocoder_address = info.geocoder_address;
        } else {
            source.geocoder_address = false;
        }

        if (info.geocoder_version) {
            source.version = parseInt(info.geocoder_version, 10);
            if (source.version !== 8) {
                err = new Error('geocoder version is not 8, index: ' + id);
                return;
            }
        } else {
            source.version = 0;
            source.shardlevel = info.geocoder_shardlevel || 0;
        }

        // Fold language templates into geocoder_format object
        source.geocoder_format = { default: info.geocoder_format };
        Object.keys(info).forEach((key) => {
            if (/^geocoder_format_/.exec(key)) {
                source.geocoder_format[key.replace(/^geocoder_format_/, '')] = info[key];
            }
        });

        source.geocoder_address_order = info.geocoder_address_order || 'ascending'; // get expected address order from index-level setting
        source.geocoder_layer = (info.geocoder_layer || '').split('.').shift();
        source.geocoder_tokens = info.geocoder_tokens || {};
        source.geocoder_inverse_tokens = options.geocoder_inverse_tokens || {};
        source.geocoder_inherit_score = info.geocoder_inherit_score || false;
        source.geocoder_universal_text = info.geocoder_universal_text || false;
        source.geocoder_reverse_mode = info.geocoder_reverse_mode || false;
        source.token_replacer = token.createReplacer(info.geocoder_tokens || {});
        source.indexing_replacer = token.createReplacer(info.geocoder_tokens || {}, { includeUnambiguous: true, custom: source.geocoder_inverse_tokens || {} });

        if (tokenValidator(source.token_replacer)) {
            throw new Error('Using global tokens');
        }

        source.maxzoom = info.maxzoom;
        source.maxscore = info.maxscore;
        source.minscore = info.minscore;
        source.stack = stack;
        source.zoom = info.maxzoom + parseInt(info.geocoder_resolution || 0,10);

        if (info.scoreranges && ((!info.maxscore && info.maxscore !== 0) || (!info.minscore && info.minscore !== 0))) {
            throw new Error('Indexes using scoreranges must also provide min/maxscore attribute');
        }

        source.scoreranges = info.scoreranges ? info.scoreranges : {};
        source.maxscore = info.maxscore;
        source.minscore = info.minscore;
        source.types = types;
        source.type = type;
        source.name = name;
        source.id = id;
        source.idx = i;
        source.ndx = names.indexOf(name);
        source.bounds = info.bounds || [-180, -85, 180, 85];

        // arrange languages into something presentable
        const lang = {};
        lang.has_languages = languages.length > 0;
        lang.languages = ['default'].concat(languages.map((l) => { return l.replace('-', '_'); }).sort());
        lang.hash = crypto.createHash('sha512').update(JSON.stringify(lang.languages)).digest().toString('hex').slice(0,8);
        lang.lang_map = {};
        lang.languages.forEach((l, idx) => { lang.lang_map[l] = idx; });
        lang.lang_map['unmatched'] = 128; // @TODO verify this is the right approach
        source.lang = lang;

        // decide whether to use the text normalization cache
        source.use_normalization_cache = typeof info.use_normalization_cache == 'undefined' ? false : info.use_normalization_cache;
        if (source.use_normalization_cache && fs.existsSync(data.norm) && !source._dictcache.normalizationCache) {
            source._dictcache.loadNormalizationCache(data.norm);
        }

        this._error = err;

        // add byname index lookup
        this.byname[name] = this.byname[name] || [];
        this.byname[name].push(source);

        // add bytype index lookup
        for (let t = 0; t < types.length; t++) {
            this.bytype[types[t]] = this.bytype[types[t]] || [];
            this.bytype[types[t]].push(source);
        }

        // add bysubtype index lookup
        for (let st = 0; st < scoreRangeKeys.length; st++) {
            this.bysubtype[type + '.' + scoreRangeKeys[st]] = this.bysubtype[type + '.' + scoreRangeKeys[st]] || [];
            this.bysubtype[type + '.' + scoreRangeKeys[st]].push(source);
        }

        // add bystack index lookup
        for (let j = 0; j < stack.length; j++) {
            this.bystack[stack[j]] = this.bystack[stack[j]] || [];
            this.bystack[stack[j]].push(source);
        }

        // add byidx index lookup
        this.byidx[i] = source;
    }

    /**
     * Loads an index. The source clone is opened and all of the information
     * needed for adding the index to the geocoder is obtained. If the
     * original source object does not have a `_dictcache` member, then it is
     * instantiated here, included in the returned object.
     *
     * @access private
     *
     * @param {string} id - the name of the index, eg "place" or "address"
     * @param {Tilesource} source - a (clone of) a tilelive source
     * @param {function(error, Object)} callback - callback function.
     */
    function loadIndex(id, source, callback) {
        source.open((err) => {
            if (err) return callback(err);

            source.getBaseFilename = function() {
                const filename = source._original.cacheSource ? source._original.cacheSource.filename : source._original.filename;
                if (filename) {
                    return filename.replace('.mbtiles', '');
                } else {
                    return require('os').tmpdir() + '/temp.' + Math.random().toString(36).substr(2, 5);
                }
            };

            const q = queue();
            q.defer((done) => { source.getInfo(done); });
            q.defer((done) => {
                const dawgFile = source.getBaseFilename() + '.dawg';
                if (source._original._dictcache || !fs.existsSync(dawgFile)) {
                    done();
                } else {
                    fs.readFile(dawgFile, done);
                }
            });
            q.awaitAll((err, loaded) => {
                if (err) return callback(err);

                let props;
                // if dictcache is already initialized don't recreate
                if (source._original._dictcache) {
                    props = {
                        id: id,
                        info: loaded[0]
                    };
                // create dictcache at load time to allow incremental gc
                } else {
                    props = {
                        id: id,
                        info: loaded[0],
                        dictcache: new dawgcache(loaded[1])
                    };
                }

                const filename = source.getBaseFilename();
                props.freq = filename + '.freq.rocksdb';
                props.grid = filename + '.grid.rocksdb';
                props.norm = filename + '.norm.rocksdb';
                callback(null, props);
            });
        });
    }

}

/**
 * Clones the source object. Methods in the cloned object are all bound
 * with the original source as their first argument.
 *
 * @access private
 *
 * @param {Tilesource} source - a tilelive [Tilesource](https://github.com/mapbox/tilelive/blob/master/API.md)
 * @returns {Tilesource} a clone of the input Tilesource
 */
function clone(source) {
    const cloned = {};
    cloned.getInfo = source.getInfo.bind(source);
    cloned.getTile = source.getTile.bind(source);
    cloned.open = function(callback) {
        if (source.open === true) return callback();
        if (typeof source.open === 'function') return source.open(callback);
        return source.once('open', callback);
    };
    // Optional methods
    [
        '_commit',
        'putInfo',
        'putTile',
        'getGeocoderData',
        'putGeocoderData',
        'getBaseFilename',
        'geocoderDataIterator',
        'startWriting',
        'stopWriting',
        'getIndexableDocs',
        'serialize'
    ].forEach((method) => {
        if (typeof source[method] === 'function') {
            cloned[method] = source[method].bind(source);
        }
    });
    // Include reference to original
    cloned._original = source;
    return cloned;
}

/**
 * Validates token replacer. Ensures that none of the values in from or to include blank space.
 *
 * @access private
 *
 * @param {Object} token_replacer - a token replacer
 * @returns {(null|true)} true if any 'from' or 'to' values contains blank space
 */
function tokenValidator(token_replacer) {
    for (let i = 0; i < token_replacer.length; i++) {
        if (token_replacer[i].from.toString().indexOf(' ') >= 0 || token_replacer[i].to.toString().indexOf(' ') >= 0) {
            return true;
        }
    }
}

/**
 * Ensure that all carmen sources are opened
 *
 * @access private
 *
 * @param {function} callback - a callback function
 * @returns {boolean} true if all sources have been opened
 */
Geocoder.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

/**
 * Main entry point for geocoding API. Returns results across all indexes for
 * a given query.
 *
 * @access public
 *
 * @name Geocoder#geocode
 * @memberof Geocoder
 * @see {@link #geocode|gecode} for more details, including
 * `options` properties.
 *
 * @param {string} query - a query string, eg "Chester, NJ"
 * @param {Object} options - options
 * @param {function} callback - a callback function, passed on to {@link #geocode|geocode}
 */
Geocoder.prototype.geocode = function(query, options, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        geocode(self, query, options, callback);
    });
};

/**
 * Main entry point for indexing. Index docs from one source to another.
 *
 * @name Geocoder#index
 * @memberof Geocoder
 * @see {@link #index|index} for more details, including `options` properties.
 *
 * @access public
 *
 * @param {stream.Readable} from - a readable stream of GeoJSON features
 * @param {Tilesink} to - a {@link tilelive.Tilesink https://github.com/mapbox/tilelive/blob/master/API.md} describing the destination of the index
 * @param {Object} options - options
 * @param {number} options.zoom - the max zoom level for the index
 * @param {stream.Writable} options.output - the output stream for
 * @param {Object<string, string>} options.tokens - mapping from string patterns to strings. patterns are replaced with strings when found in queries. helpful for abbreviations, eg. "Streets" => "St"
 * @param {function} callback - a callback function, passed on to {@link #index|inde}
 */
Geocoder.prototype.index = function(from, to, options, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        index(self, from, to, options, callback);
    });
};

// Merge two indexes
Geocoder.prototype.merge = function(from1, from2, to, pointer, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        merge(self, from1, from2, to, pointer, callback);
    });
};

// Merge arbitrarily many indexes
Geocoder.prototype.multimerge = function(froms, to, pointer, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        merge.multimerge(self, froms, to, pointer, callback);
    });
};

// Analyze a source's index.
Geocoder.prototype.analyze = function(source, callback) {
    this._open((err) => {
        if (err) return callback(err);
        analyze(source, callback);
    });
};

// Copy a source's index to another.
Geocoder.prototype.copy = function(from, to, callback) {
    this._open((err) => {
        if (err) return callback(err);
        copy(from, to, callback);
    });
};

Geocoder.auto = loader.auto;
Geocoder.autodir = loader.autodir;
Geocoder.setVtCacheSize = getContext.getTile.setVtCacheSize;
