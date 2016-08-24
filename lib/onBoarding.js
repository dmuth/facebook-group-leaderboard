

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
* This function checks to make sure we have at least one crowd and at least one group in that crowd.
*/
function checkConfigCrowds(config) {
	return(new Promise(function(resolve, reject) {

		//
		// Do we have at least one crowd?
		//
		var keys = Object.keys(config.crowds);
		if ( !config.crowds || !keys.length ) {
			console.log("# ");
			console.log("# No crowds are defined in our configuraiton!");
			console.log("# ");
			reject("No crowds defined!");
			return(null);
		}

		//
		// Now go through our crowds and make sure we have at least one group
		//
		for (var k in keys) {
			var key = keys[k];
			var crowd = config.crowds[key];

			//
			// No groups?  Continue.
			//
			if (!crowd.groups) {
				continue;
			}

			if (!crowd.name) {
				console.log("#");
				console.log("# No name specified for crowd with key '" + key + "'. ");
				console.log("# Please add one into the configuration to continue.");
				console.log("#");
				var error = "No name specified for crowd with key '" + key + "'. Please add one into the configuration to continue.";
				reject(error);
				return(null);
			}

			var keys2 = Object.keys(crowd.groups);
			if (!keys2.length) {
				continue;
			}

			for (var k2 in keys2) {
				var key2 = keys2[k2];
				var group = crowd.groups[key2];

				//
				// If we find an ID, we're good to go! Stop here.
				//
				if (group.id) {
					resolve();
					return(null);
				}

			}		

		}

		//
		// If we got here, we didn't find any groups, so throw an error
		//
		console.log("# ");
		console.log("# No groups were found in the configuration. ");
		console.log("# Please ensure that at least one crowd is specified with one group.");
		console.log("# ");
		var error = "No groups were found in the configuration.  Please ensure that at least one crowd is specified with one group.";
		reject(error);

	}));
} // End of checkConfigCrowds()



/**
* Check our tokens and print a warning if we do not have at least one token.
*/
function checkTokens(tokens) {
	return(new Promise(function(resolve, reject) {

		tokens.load().then(function() {
			return tokens.count();

		}).then(function(num) {
			return tokens.count();

			if (!num) {
				console.log("# ");
				console.log("# No Facebook auth tokens found!");
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

			return(checkConfigCrowds(config));
		}).then(function() {

			return(checkTokens(tokens));
		}).then(function() {

			cb();

		}).catch(function(error) {
			cb(error);

		});

	} // End of go()

}



