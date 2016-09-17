

var debug = require("debug")("query");
var request = require("superagent");
var Token = require("../tokens");

var tokens = new Token();


/**
* This function will send a query to Facebook, get the results, try parsing
* then as JSON, and then fire the callback.  If anything goes wrong, we'll retry.
*
* @param string uri The URI on Facebook Graph
* @param string token The access token
* @param float retryInterval How many seconds before retrying if something went wrong.
* @param object cb The callback to fire. First argument is the error.
*/
module.exports = function query(uri, token, retryInterval, cb) {

	//uri = "what"; // Debugging
	var url = "https://graph.facebook.com/v2.7/" + uri;

	if (uri.indexOf("?") != -1) {
		url += "&";
	} else {
		url += "?";
	}

	//
	// Only add in our token if it's not explicitly specified.
	// This is kind of a hack--and only useful with endpoints like /debug_token,
	// where the App Secret is required instead.
	//
	if (uri.indexOf("access_token") == -1) {
		url += "&access_token=" + token;
	} 

	debug("Starting query: " + uri);

	//
	// Make our Request
	//
	request.get(url)
		.end(function(err, res) {

			//
			// If there is an error, try again shortly.
			//
			//err = {response: { error: { text: "DEBUG ERROR"}}}; // Debugging
			//err = {response: { error: { text: "the user has changed the password"}}}; // Debugging

			if (err) {
				var error = "Got HTTP: " + err.status + ", '" + err.response.error.text + "' on URI '" + uri + "'";
				debug("Full error: " + JSON.stringify(err));

				//
				// If the password was changed by the user, this token will never work, 
				// and we should delete it.
				//
				if ( !error.match(/the user has changed the password/) ) {
					tokens.updateLastFailed(token).then(function() {
					}).catch(function(err) {
						debug("Ignoring this error, probably because the token didn't yet exist...", err);

					});

				} else {
					debug("This token will never work due to a changed password, deleting it!");

					tokens.delete(token).then(function() {
					}).catch(function(err) {
						debug("Error deleting this token: " + err);
					});

				}

			}

			if (error) {
				cb(error);
			}

			//
			// Now try decoding our JSON.  If there is an error try again shortly.
			//
			var retval = "";

			try {
				retval = JSON.parse(res.text);

			} catch (e) {
				debug("Got malformed-JSON error %s on text '" + res.text + "', trying again in " + retryInterval + " seconds.");
				setTimeout(function() {
					query(uri, token, retryInterval, cb);
					}, retryInterval * 1000);
				return(null);

			}
	
			debug("Query complete! " + uri);

			tokens.updateLastSuccessful(token).then(function() {
				cb(null, retval);
			}).catch(function(err) {
				debug("Ignoring this error, probably because the token didn't yet exist...", err);
				cb(null, retval);
			});

		});

} // End of query()



