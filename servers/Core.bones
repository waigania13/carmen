var env = process.env.NODE_ENV || 'development';

servers['Core'].prototype.port = 13104;
servers['Core'].prototype.start = function(callback) {
    this.port && this.listen(this.port, this.plugin.config.listenHost, callback);
    return this;
};
servers['Core'].prototype.initialize = function(app) {
    this.port = app.config.port || this.port;
    this.use(new servers['Middleware'](app));
    this.use(new servers['App'](app));
};
