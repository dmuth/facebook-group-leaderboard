/**
* This module is responsible for making requests to Facebook's Graph API 
* and making that data available externally.
*/

var debug = require("debug")("facebook");
var request = require("superagent");

var stats = require("./stats");


//
// Our main data structure.  This is updated by workers that fetch data.
//
var facebook_data = {};


/**
* This function will send a query to Facebook, get the results, try parsing
* then as JSON, and then fire the callback.  If anything goes wrong, we'll retry.
*
* @param string uri The URI on Facebook Graph
* @param string token The access token
* @param float retryInterval How many seconds before retrying if something went wrong.
* @param object cb The callback to fire. First argument is the error.
*/
function query(uri, token, retryInterval, cb) {

	var url = "https://graph.facebook.com/v2.7/" + uri;

	if (uri.indexOf("?") != -1) {
		url += "&";
	} else {
		url += "?";
	}

	url += "access_token=" + token;

	//
	// Make our Request
	//
	request.get(url)
			.end(function(err, res) {

				//
				// If there is an error, try again shortly.
				//
				if (err) {
					debug("Got error: %s, trying again in " + retryInterval + " seconds", err);
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
	
				cb(null, retval);

			});

} // End of query()


/**
* Fetch our data from the group, including recent posts, then store it in our data structure.
*/
function fetchGroupData(token, group, retryInterval) {

	var uri = group;
	query(uri, token, retryInterval, function(err, data) {

		var id = data.id;
		var name = data.name;

		var uri = id + "/feed?fields=from,message,comments&limit=20";
		query(uri, token, retryInterval, function(err, data) {

			var post_stats = new stats();
			var comment_stats = new stats();

			for (var key in data.data) {

				var post = data.data[key];
				post_stats.incr(post.from);

				if (post.comments) {
					for (var key2 in post.comments.data) {
						var comment = post.comments.data[key2];
						comment_stats.incr(comment.from);
					}
				}



			}


			var stats_data = {
				id: id,
				name: name,
				post_stats: post_stats.getTop(10),
				comment_stats: comment_stats.getTop(10),
				};
			facebook_data[id] = stats_data;

console.log(JSON.stringify(facebook_data, null, 4));

			});

		});


} // End of fetchGroupData()


/**
* This is the object that gets returned to the caller.
*/
var obj = {


	/**
	* Our main entry point
	*
	* @param object config Our configuration object
	*/
	go: function(config) {

		for (key in config.groups) {
			var group = config.groups[key];
			setImmediate(function() {
				debug("Spawning worker for group ID %s", group);
				fetchGroupData(config.accessToken, group, config.retryInterval);
				});

		}

	}

}

module.exports = function() {
	return(obj);
}

