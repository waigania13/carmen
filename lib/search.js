var termops = require('./util/termops'),
    ops = require('./util/ops'),
    _ = require('underscore'),
    Relev = require('./util/relev');

var idmod = Math.pow(2,25);

module.exports = function(source, query, id, callback) {
    var idx = source._carmen.idx,
        dbname = source._carmen.name,
        terms = termops.terms(query),
        weights = {},
        relevs = {},
        stats = {
            degen: [0,0,0],
            phrase: [0,0,0],
            term: [0,0,0],
            relevd: [0,0,0],
            grid: [0,0,0]
        },
        querymap = {},
        docrelev = {};

    getDegen(terms, [], 0, function degenDone(err, terms) {
        if (err) return callback(err);
        getPhrases(terms, function phrasesDone(err, phrases) {
            if (err) return callback(err);
            getTerms(phrases, function termsDone(err, terms) {
                if (err) return callback(err);
                getFreqs(terms, function freqsDone(err) {
                    if (err) return callback(err);
                    var sets = getSets(phrases);
                    getgrids(sets, function gridsDone(err, features, result) {
                        if (err) return callback(err);
                        return callback(null, features, result, stats);
                    });
                });
            });
        });
    });

    function getDegen(queue, result, idx, callback) {
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

            termdist.sort(ops.sortDegens);

            for (var i = 0; i < termdist.length && i < 10; i++) {
                var term = Math.floor(termdist[i]/4);
                querymap[term] = [idx, termdist[i]%4];
                result.push(term);
            }

            return getDegen(queue, result, idx+1, callback);
        }
    }

    function getPhrases(queue, callback) {
        stats.phrase[0]++;
        stats.phrase[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'term', queue, function(err, result) {
            if (err) return callback(err);
            stats.phrase[2] = stats.phrase[2] && (+new Date() - stats.phrase[2]);
            stats.phrase[1] = result.length;
            return callback(null, result);
        });
    }

    function getTerms(queue, callback) {
        stats.term[0]++;
        stats.term[2] = +new Date();
        source._carmen.getall(source.getCarmen.bind(source), 'phrase', queue, function(err, result) {
            if (err) return callback(err);
            stats.term[2] = stats.term[2] && (+new Date() - stats.term[2]);
            stats.term[1] = result.length;
            return callback(null, result);
        });
    }

    function getFreqs(queue, callback) {
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

    function getSets(phrases) {
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
            var term = 0,
                relev = 0,
                total = 0,
                count = 0,
                reason = 0,
                termpos = -1,
                lastpos = -1,
                termdist = 0,
                chardist = 0;

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
        result = _.uniq(result, true);
        stats.relevd[2] = +new Date() - stats.relevd[2];
        stats.relevd[1] = result.length;
        return result;
    }

    function getgrids(queue, callback) {
        stats.grid[0]++;
        stats.grid[2] = +new Date();

        source._carmen.getall(source.getCarmen.bind(source), 'grid', queue, function(err) {
            if (err) return callback(err);

            var result = [],
                features = {},
                id, relev, grids,
                grid, feat;

            for (var a = 0; a < queue.length; a++) {
                id = queue[a],
                relev = relevs[id],
                grids = source._carmen.get('grid', id);

                for (var i = 0; i < grids.length; i++) {
                    grid = grids[i];
                    feat = grid % idmod;
                    if (!features[feat] || docrelev[feat] < relev.tmprelev) {
                        features[feat] = new Relev(feat,
                            relev.relev,
                            relev.reason,
                            idx,
                            dbname,
                            idx * 1e14 + feat);
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
};
