// Locking event emitter for consolidating I/O for identical requests.
var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits;

module.exports = Locking;

inherits(Locking, EventEmitter);

function Locking() {
    this.setMaxListeners(0);
}

Locking.prototype.loader = function(callback) {
    var locking = this;
    return function(err, data) {
        locking.open = true;
        locking.data = data;
        locking.emit('open', err, data);
        callback(err, data);
    };
};
