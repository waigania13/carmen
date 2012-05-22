var carmen = require('../index.js');

server = Bones.Server.extend({});

server.prototype.initialize = function(app) {
    this.get('/', this.page);
    this.get('/api/:query', this.query);
};

server.prototype.page = function(req, res, next) {
    res.send(templates.Page());
};

server.prototype.query = function(req, res, next) {
    if (!req.param('query')) return res.send(404);
    carmen.geocode(req.param('query'), function(err, data) {
        if (err) return next(err);
        res.send(data);
    });
};

