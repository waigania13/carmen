var _ = require('underscore'),
    queue = require('queue-async');
// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
module.exports = function store(source, callback) {
    if (source._geocoder._known) delete source._geocoder._known;

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
                        data.sort();
                        source._geocoder.set(type, id, _(data).uniq(true));
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
    q.awaitAll(callback);
};
