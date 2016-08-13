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
function fetchGroupData(token, group, retryInterval, numPosts, numTopPosters, numTopCommenters) {

	var uri = group;
	query(uri, token, retryInterval, function(err, data) {

		var id = data.id;
		var name = data.name;

		var uri = id + "/feed?fields=from,message,comments&limit=" + numPosts;
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
				post_stats: post_stats.getTop(numTopPosters),
				comment_stats: comment_stats.getTop(numTopCommenters),
				last_updated: new Date(),
				};
			facebook_data[id] = stats_data;

			});

		});


} // End of fetchGroupData()


var obj = function(config) {
	this.config = config;
}


obj.prototype.getData = function() {
	return(facebook_data);
}


obj.prototype.go = function() {

	var groups = this.config.groups;
	var token = this.config.accessToken;
	var retryInterval = this.config.retryInterval;
	var numPosts = this.config.numPosts;
	var numTopPosters = this.config.numTopPosters;
	var numTopCommenters = this.config.numTopCommenters;

	for (key in groups) {
		var group = groups[key];
		setImmediate(function() {
			debug("Spawning worker for group ID %s", group);
			fetchGroupData(token, group, retryInterval, numPosts, numTopPosters, numTopCommenters);
			});

	}

} // End of go()


module.exports = function(config) {
	return(new obj(config));
}

