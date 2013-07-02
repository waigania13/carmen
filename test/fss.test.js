var fss = require('../lib/_fss.node');
var assert = require('assert');

describe('fss', function() {
    it('should work', function(done) {
        var engine = new fss.Engine();
        engine.add({file:'foo.txt',distance:10});
        console.log(engine.query('foo'));
        done();
    });
});