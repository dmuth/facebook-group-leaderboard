var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require("config");
var Facebook = require("./lib/facebook");

var passport = require('passport');
var session = require("./lib/session")(config.sessionSecret);

var routes = require('./routes/index');
var group = require("./routes/group");
var auth = require("./routes/auth")(config.facebookAuth);
var logout = require("./routes/logout");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


var fb = new Facebook(config);
fb.go();
//setInterval(function() {
	//console.log("TEST", JSON.stringify(fb.getData(), null, 2));
	//console.log("TESTap", fb.getData()["anthrocon"].post_stats.length);
	//console.log("TESTac", fb.getData()["anthrocon"].comment_stats.length);
	//console.log("TESTa2p", fb.getData()["anthrocon2"].post_stats.length);
	//console.log("TESTa2c", fb.getData()["anthrocon2"].comment_stats.length);
/*
*/
//	}, 3000);

app.use(session());
app.use(passport.initialize());
app.use(passport.session());

/**
* Function to serialize our user info before storing it in the session
*/
passport.serializeUser(function(user, done) {
	//debug("serializeUser(): %j", user);
	done(null, user);
});

/**
* Function to deserialize our user info when pulling it from the session.
*/
passport.deserializeUser(function(id, done) {
	//debug("deserializeUser(): %j", id);
	done(null, id);
});

app.use('/', routes(fb));
app.use("/group", group(fb));
app.use("/auth", auth);
app.use("/logout", logout);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
