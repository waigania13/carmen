var fork = require('child_process').fork;
var cpus = require('os').cpus().length;
module.exports = validatedocs;

function validatedocs(docs, callback) {
    // Setup workers.
    var error = '';
    var workers = [];
    var remaining = docs.length;
    for (var i = 0; i < cpus; i++) {
        workers[i] = fork(__dirname + '/validatedocs-worker.js');
        workers[i].on('exit', function(){
        
        });
        workers[i].on('message', function(err) {
            if(err) error = err
            if(remaining--) {
                workers.forEach(function(w) { w.kill('SIGHUP'); });
                if(error === ''){
                    callback();
                }
                else {
                    callback(new Error(error))
                }
            }
        });
    }
    for (var i = 0; i < docs.length; i++) {
        workers[i%cpus].send(docs[i]);
    }
}