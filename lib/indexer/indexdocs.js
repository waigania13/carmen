var fork = require('child_process').fork;
var cpus = require('os').cpus().length;

module.exports = indexdocs;

function indexdocs(docs, freq, zoom, callback) {
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        if (!doc._id) return callback(new Error('doc has no _id'));
        if (!doc._text) return callback(new Error('doc has no _text on _id:' + doc._id));
        if (!doc._center) return callback(new Error('doc has no _center on _id:' + doc._id));
        if(!doc._zxy || doc._zxy.length === 0) {
            if(typeof zoom != 'number') return callback(new Error('index has no zoom on _id:'+doc.id));
            if(zoom < 0) return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom+' on _id:'+doc.id));
            if(zoom > 14) return callback(new Error('zoom must be less than 15 --- zoom was '+zoom+' on _id:'+doc.id));
        }
    }

    var collector = fork(__dirname + '/indexdocs-collector.js');
    var workers = [];
    var remaining = docs.length;

    // Setup workers.
    for (var i = 0; i < cpus; i++) {
        workers[i] = fork(__dirname + '/indexdocs-worker.js');
        workers[i].send({freq:freq, zoom:zoom});
        workers[i].on('exit', exit);
        workers[i].on('message', function(patch) {
            collector.send(patch);
            if (!--remaining) collector.send('finish');
        });
    }

    // Send docs to workers.
    for (var i = 0; i < docs.length; i++) {
        workers[i%cpus].send(docs[i]);
    }

    // When collector sends data back we're done.
    collector.on('exit', exit);
    collector.on('message', function(patch) {
        collector.kill('SIGHUP');
        workers.forEach(function(w) { w.kill('SIGHUP'); });
        // Final validation that indexing succeeded.
        for (var i = 0; i < patch.docs.length; i++) {
            var doc = patch.docs[i];
            if (!doc._zxy || doc._zxy < 1) return callback(new Error('doc failed spatial indexing'));
        }
        callback(null, patch);
    });
}

function exit(code) {
    if (!code) return;
    console.warn('Index worker exited with ' + code);
    process.exit(code);
}

