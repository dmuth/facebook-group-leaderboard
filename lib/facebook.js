/**
* This module is responsible for making requests to Facebook's Graph API 
* and making that data available externally.
*/

var debug = require("debug")("facebook");
var request = require("superagent");

var stats = require("./stats");


//
// Our main data structure.  This is updated by workers that fetch data.
// I'm not thrilled that this is effectively a global, but it seemed to be the path
// of least resistance when dealing with callbacks outside of objects.
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
					debug("Got error: %s, trying again in " + retryInterval + " seconds " + uri, err);
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


/**
* Fetch our data from the group, including recent posts, then store it in our data structure.
*/
function fetchGroupData(token, crowd_key, crowd_name, group_key, config) {

	var uri = config.id;
	query(uri, token, config.retryInterval, function(err, data) {

		var id = data.id;
		var name = data.name;

		var uri = id + "/feed?fields=from,message,comments&limit=" + config.numPosts;
		query(uri, token, config.retryInterval, function(err, data) {

			var post_stats = new stats();
			var comment_stats = new stats();

			for (var key in data.data) {

				var post = data.data[key];
				if (post.from) {
					post_stats.incr(post.from);
				}

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
				crowd_name: crowd_name,
				post_stats: post_stats.getTop(config.numTopPosters),
				comment_stats: comment_stats.getTop(config.numTopCommenters),
				last_updated: new Date(),
				config: config,
				};

			//
			// If the crowd key doesn't exist, add it, and sort the crowd keys.
			//
			if (!facebook_data[crowd_key]) {

				facebook_data[crowd_key] = {};
// TEST
				facebook_data[crowd_key].name = crowd_name;

				var keys = Object.keys(facebook_data).sort();

				//
				// Don't have "sortedKeys" present, as it's a meta key
				//
				for (var k in keys) {
					var key = keys[k];
					if (key == "sortedKeys") {
						delete keys[k];
					}
				}

				facebook_data.sortedKeys = keys;

			}

			//
			// If the group key doesn't exist, add it and sort the group keys.
			//
			// We're doing the sorting at add-time so we don't have to repatedly 
			// do it at display-time.
			//
			if (!facebook_data[crowd_key][group_key]) {
				facebook_data[crowd_key][group_key] = {};

				var keys = Object.keys(facebook_data[crowd_key]).sort();

				for (var k in keys) {
					var key = keys[k];
					if (key == "sortedKeys") {
						delete keys[k];
					}
				}

				facebook_data[crowd_key].sortedKeys = keys;
			}

			facebook_data[crowd_key][group_key] = stats_data;

			debug("Group data successfully saved! " + uri);
			debug("Refreshing data for crowd '" + crowd_key + "', group '" + group_key + "' again in " + config.refreshInterval + " seconds... " + JSON.stringify(config));
			setTimeout(function() {
				fetchGroupData(token, crowd_key, crowd_name, group_key, config);
				}, config.refreshInterval * 1000);

			});

		});


} // End of fetchGroupData()


/**
* Go through our configuration and any group-specific overrides, apply them, and
* return the configuration for this group.
*/
function getGroupConfig(config, group) {

	var retval = {
		name: config.name,
		numPosts: config.numPosts,
		numTopPosters: config.numTopPosters,
		numTopCommenters: config.numTopCommenters,
		refreshInterval: config.refreshInterval,
		retryInterval: config.retryInterval,
		};

	for (var key in retval) {
		if (group[key]) {
			retval[key] = group[key];
		}
	}

	//
	// Grab our group ID
	//
	retval.id = group.id;

	return(retval);

} // End of getGroupConfig()


var obj = function(config) {
	this.config = config;
}


//
// Return our Facebook data.
//
obj.prototype.getData = function() {

	var retval = {};

	//
	// Loop through our sorted keys and create a data structure where things are sorted.
	// Since there is potentially a lot of copying going on here, I may in the future
	// move this into fetchGroupData() so this isn't run on every page load.
	//
	for (var k in facebook_data.sortedKeys) {
		var key = facebook_data.sortedKeys[k];

		retval[key] = {};

		for (var k2 in facebook_data[key].sortedKeys) {
			var key2 = facebook_data[key].sortedKeys[k2];

			retval[key][key2] = {};
			retval[key][key2] = facebook_data[key][key2];

		}

	}

	return(retval);

} // End of getData()


//
// Our main entry point.
//
obj.prototype.go = function() {

	var crowds = this.config.crowds;
	var token = this.config.accessToken;
	var retryInterval = this.config.retryInterval;
	var numPosts = this.config.numPosts;
	var numTopPosters = this.config.numTopPosters;
	var numTopCommenters = this.config.numTopCommenters;

	for (var crowds_key in crowds) {

		var groups = crowds[crowds_key];
		var crowd_name = crowds[crowds_key].name;

		for (groups_key in groups.groups) {

			var group = groups.groups[groups_key];

			//
			// Load our default configuration options, and then override them 
			// with anything specific for this group.
			//
			var group_config = getGroupConfig(this.config, group);

			(function(crowds_key, crowd_name, groups_key, group_config) {
				setImmediate(function() {
					debug("Spawning worker for crowd '" + crowds_key + "', group '" + groups_key + "', config: %s", JSON.stringify(group_config));
					fetchGroupData(token, crowds_key, crowd_name, groups_key, group_config);
					});
			})(crowds_key, crowd_name, groups_key, group_config)

		}

	}

} // End of go()


module.exports = function(config) {
	return(new obj(config));
}



