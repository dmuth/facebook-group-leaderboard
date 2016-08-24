

var Promise = require("bluebird");
var debug = require("debug")("onboarding");


/**
* Check our configuration to make sure we're not using default values.
*/
function checkConfig(config) {
	return(new Promise(function (resolve, reject) {

		console.log("#");
		console.log("# Starting pre-flight check..");
		console.log("#");

		if (config.facebookAuth.clientID == "FIXME") {
			console.log("#");
			console.log("# config.facebookAuth.clientID has not been set!  ");
			console.log("# Please set it to your app ID obtained from https://developers.facebook.com/");
			console.log("#");
			var error = "config.facebookAuth.clientID has not been set!  Please set it to your app ID obtained from https://developers.facebook.com/";
			reject(error);
			return(null);
		}

		if (config.facebookAuth.clientSecret == "FIXME") {
			console.log("#");
			console.log("# config.facebookAuth.clientSecret has not been set!  ");
			console.log("# Please set it to your app ID obtained from https://developers.facebook.com/");
			console.log("#");
			var error = "config.facebookAuth.clientSecret has not been set!  Please set it to your app ID obtained from https://developers.facebook.com/";
			reject(error);
			return(null);
		}

		if (config.facebookAuth.callbackURL == "FIXME") {
			console.log("#");
			console.log("# config.facebookAuth.callbackURL has not been set! ");
			console.log("# It should be set to the endpoint /auth/facebook/callback, ");
			console.log("# so something like http://localhost:3000/auth/facebook/callback or similar.");
			console.log("#");
			var error = "config.facebookAuth.callbackURL has not been set! It should be set to the endpoint /auth/facebook/callback, so something like http://localhost:3000/auth/facebook/callback or similar.";
			reject(error);
			return(null);
		}

		if (config.sessionSecret == "FIXME") {
			console.log("#");
			console.log("# config.sessionSecret needs to be reset with a replacement key. ");
			console.log("# You can use a random string or a human-readable key.  If you want ");
			console.log("# to do the latter, you can go to https://www.dmuth.org/diceware/ to generate one!");
			console.log("#");
			var error = "config.sessionSecret needs to be reset with a replacement key.  You can use a random string or a human-readable key.  If you want to do the latter, you can go to https://www.dmuth.org/diceware/ to generate one!";
			reject(error);
			return(null);
		}

		resolve();

	}));
} // End of checkConfig()


/**
* Check our tokens and print a warning if we do not have at least one token.
*/
function checkTokens(tokens) {
	return(new Promise(function(resolve, reject) {

		tokens.load(function() {
			return(tokens.count());

		}).then(function(num) {
			if (!num) {
				console.log("# ");
				console.log("# No Facebook auto tokens found!");
				console.log("# This means that we will not start fetching data until ");
				console.log("# someone logs with Facebook from the UI.");
				console.log("# ");
			}

			resolve();

		}).catch(function(error) {
			reject(error);

		});

	}));
} // End of checkTokens()


module.exports = {

	/**
	* Our preflight check on configuration and tokens.
	* If something is wrong, throw an error.
	*/ 
	go: function(config, tokens, cb) {

		checkConfig(config).then(function() {

			return(checkTokens(tokens));
		}).then(function() {

			cb();

		}).catch(function(error) {
			cb(error);

		});

	} // End of go()

}



