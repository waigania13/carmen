var fork = require('child_process').fork;
var cpus = require('os').cpus().length;
var TIMER = process.env.TIMER;
var workers = [];
module.exports = validatedocs;
module.exports.teardown = teardown;

function validatedocs(docs, zoom, callback) {
    // Setup workers.
    var error = '';
    var docsProcessed = 0;
    if (TIMER) console.time('validatedocs:setup');
    for (var i = 0; i < cpus; i++) {
        workers[i] = workers[i] || fork(__dirname + '/validatedocs-worker.js');
        workers[i].removeAllListeners('exit');
        workers[i].on('exit', function(code){
            if(code) throw new Error('worker exited with code: ' + code);
        });
        workers[i].removeAllListeners('message');
        workers[i].on('message', function(err) {
            if(err) error = err;
            if(docsProcessed >= docs.length-1) {
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
    if (TIMER) console.timeEnd('validatedocs:setup');
    if (TIMER) console.time('validatedocs:send');
    // send docs out to workers
    for (var i = 0; i < docs.length; i++) {
        workers[i%cpus].send({doc: docs[i], zoom: zoom});
    }
    if (TIMER) console.timeEnd('validatedocs:send');
}

function teardown() {
    while (workers.length) {
        workers.shift().kill('SIGHUP');
    }
}

