var _ = require('underscore'),
    defer = typeof setImmediate === 'undefined' ? process.nextTick : setImmediate;
// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
module.exports = function store(source, callback) {
    var queue = [];

    ['freq','term','phrase','grid','degen'].forEach(loadTerm);

    function loadTerm(type) {
        queue = queue.concat(source._carmen.list(type).map(loadShard));
    }

    function loadShard(shard) {
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
    }

    write();

    function write() {
        if (!queue.length) return callback();
        var task = queue.shift(),
            type = task[0],
            shard = task[1];
        source.putCarmen(type, shard, source._carmen.pack(type, shard), function(err) {
            if (err) return callback(err);
            defer(function() { write(); });
        });
    }
};
