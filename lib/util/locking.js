// Helper for locking multiple requests for the same IO operations to a
// single IO call. Callbacks for the IO operation result in many listeners
// against the same operation.
var EventEmitter = require('events').EventEmitter;
var locks = {};

module.exports = Locking;

function Locking(id, many) {
    // Create a locking event emitter.
    if (!locks[id]) {
        locks[id] = new EventEmitter();
        locks[id].setMaxListeners(0);
    }

    // Register callback to be run once lock is released.
    locks[id].once('done', many);

    // Return a function that will run its callback IO operation only once.
    return function(once) {
        if (locks[id].io) return;
        locks[id].io = true;
        once(function(err, data, headers) {
            var lock = locks[id];
            delete locks[id];
            lock.emit('done', err, data, headers);
        });
    };
};


