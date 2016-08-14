/**
* Endpoint for /auth/*
*
*/
var express = require('express');
var router = express.Router();

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var debug = require("debug")("auth");


module.exports = function(config) {


/**
* Set up Facebook
*/
passport.use(new FacebookStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL,
  }, function(accessToken, refreshToken, profile, done) {

	var user = {};
	user.name = profile.displayName;
	user.provider = profile.provider;
	user.provider_id = profile.id;

	debug("User we got from Facebook: %j", user);

	done(null, user);

  }
));


//
// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
//
router.get("/facebook", passport.authenticate("facebook"));


//
// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
//
router.get("/facebook/callback", passport.authenticate('facebook', { 
	successRedirect: '/', 
	failureRedirect: "/auth/facebook" 
	})
	);

	return(router);

} // End of module.exports()


