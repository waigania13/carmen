var _ = require('underscore'),
    queue = require('queue-async');
// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
module.exports = function store(source, callback) {
    var tasks = [];

    ['freq','term','phrase','grid','degen'].forEach(loadTerm);

    function loadTerm(type) {
        tasks = tasks.concat(source._geocoder.list(type).map(loadShard));

        function loadShard(shard) {
            var ids = source._geocoder.list(type, shard);
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
            source.putGeocoderData(type, shard, source._geocoder.pack(type, shard), callback);
        }, task);
    });
    q.awaitAll(callback);
};
