/**
* Endpoint for /auth/*
*
*/
var express = require('express');
var router = express.Router();
var Promise = require("bluebird");

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var debug = require("debug")("auth");
var query = require("../lib/facebook/query");


module.exports = function(config, tokens, facebook) {

//
// Tell passport all about Facebook
//
passport.use(new FacebookStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL,
	}, function(accessToken, refreshToken, profile, done) {

	tokens.load().then(function() {

		debug("Tokens loaded!");

		var user = {};
		user.name = profile.displayName;
		user.provider = profile.provider;
		user.provider_id = profile.id;

		var queryAsync = Promise.promisify(query);

		//
		// Now get some info on this token, such as when it expires
		//
		var uri = "/debug_token?input_token=" + accessToken + "&access_token=" + config.clientSecret;

		queryAsync(uri, accessToken, 10).then(function(data) {

			var expires = data.data.expires_at;
			var seconds_until_expire = (expires) - (new Date().getTime() / 1000);
			debug("Token for user '" + user.name + "' expires at " + new Date(expires * 1000) 
				+ " (" + seconds_until_expire + " seconds from now)");

			debug("Logged in! User we got from Facebook: %j", user);

			return(tokens.put(accessToken, user.name, expires * 1000));

		}).then(function() {
			return(tokens.count());

		}).then(function(num) {
			debug("Token stored! We now have '" + num + "' tokens available!");

			//
			// If Facebook queries were not yet running, start doing that now.
			// This will normally be executed on the very first login to Facebook.
			//
			if (!facebook.isRunning()) {
				debug("Facebook queries were not running. Now that we have an access token, start 'em up!");
				facebook.go();
			}

			done(null, user);

		}).catch(function(error) {
			debug("Caught error from /debug_token: " + error);
			done(null, user);

		});

	}).catch(function(error) {
		debug("ERROR", error);

	});

})); // End of passport.use()


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


