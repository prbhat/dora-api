var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var cors = require('cors')
var dest = require('./routes/destinations');

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/destinations', dest);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    var status = err.status || 500;
    var body = JSON.stringify({
        message: err.message || 'an error occured',
        status: status
    });
    console.log(err.stack);
    res.writeHead(status, {
        'Content-Length': body.length,
        'Content-Type': 'application/json'
    });
    res.write(body);
    res.end();
});


module.exports = app;
