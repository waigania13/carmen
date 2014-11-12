var fork = require('child_process').fork;
var cpus = require('os').cpus().length;
module.exports = validatedocs;

function validatedocs(docs, zoom, callback) {
    // Setup workers.
    var error = '';
    var workers = [];
    var docsProcessed = 0;
    for (var i = 0; i < cpus; i++) {
        workers[i] = fork(__dirname + '/validatedocs-worker.js');
        workers[i].on('exit', function(code){
            if(code) throw new Error('worker exited with code: ' + code);
        });
        workers[i].on('message', function(err) {
            if(err) error = err;
            if(docsProcessed >= docs.length-1) {
                // kill workers
                workers.forEach(function(w) { w.kill('SIGHUP'); });
                // send results
                if(!error){
                    callback();
                }
                else {
                    callback(new Error(error));
                }
            }
            docsProcessed++;
        });
    }
    // send docs out to workers
    for (var i = 0; i < docs.length; i++) {
        workers[i%cpus].send({doc: docs[i], zoom: zoom});
    }
}