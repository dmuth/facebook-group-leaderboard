

var debug = require("debug")("query");
var request = require("superagent");


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

	url += "access_token=" + token;
	debug("Starting query: " + uri);

	//
	// Make our Request
	//
	request.get(url)
		.end(function(err, res) {

			//
			// If there is an error, try again shortly.
			//
			if (err) {
				debug("Got HTTP: " + err.status + ", '" + err.response.error.text 
					+ "', trying again in " + retryInterval + " seconds " + uri);
				setTimeout(function() {
					query(uri, token, retryInterval, cb);
					}, retryInterval * 1000);
				return(null);
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
			cb(null, retval);

		});

} // End of query()



