/**
* This module is responsible for making requests to Facebook's Graph API 
* and making that data available externally.
*/

var debug = require("debug")("facebook");
var Promise = require("bluebird");

var query = require("./query");
var stats = require("../stats");


//
// Our main data structure.  This is updated by workers that fetch data.
// I'm not thrilled that this is effectively a global, but it seemed to be the path
// of least resistance when dealing with callbacks outside of objects.
//
var facebook_data = {};


/**
* This function adds our data to the Facebook data object.
*/
function addToFacebookData(crowd_key, crowd_name, group_key, stats_data) {

			//
			// If the crowd key doesn't exist, add it, and sort the crowd keys.
			//
			if (!facebook_data[crowd_key]) {

				facebook_data[crowd_key] = {};
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

} // End of addToFacebookData()


/**
* Fetch our data from the group, including recent posts, then store it in our data structure.
*/
function fetchGroupData(token, crowd_key, crowd_name, group_key, config) {

	var queryAsync = Promise.promisify(query);

	var uri = config.id;
	var group_data;

	queryAsync(uri, token, config.retryInterval).then(function(data) {

		group_data = data;
		var id = data.id;

		var uri = id + "/feed?fields=from,message,comments&limit=" + config.numPosts;

		return queryAsync(uri, token, config.retryInterval);

	}).then(function(data) {

		var post_stats = new stats();
		var comment_stats = new stats();

		//
		// Add our posts and comments to the stats
		//
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

		var top_posters = post_stats.getTop(config.numTopPosters);
		var top_commenters = comment_stats.getTop(config.numTopCommenters);

		var stats_data = {
			id: group_data.id,
			name: group_data.name,
			crowd_name: crowd_name,
			post_stats: top_posters,
			comment_stats: top_commenters,
			last_updated: new Date(),
			config: config,
			};


		var fetchGroupDataTopUserPicturesAsync = Promise.promisify(fetchGroupDataTopUserPictures);

		//
		// If we're fetching our user photos, do so then schedule a refresh.
		//
		if (config.userPhotos) {

			fetchGroupDataTopUserPicturesAsync(token, config, stats_data.post_stats).then(function(post_stats) {
				stats_data.post_stats = post_stats;
				return fetchGroupDataTopUserPicturesAsync(token, config, stats_data.comment_stats);

			}).then(function(comment_stats) {
				addToFacebookData(crowd_key, crowd_name, group_key, stats_data);
				debug("Group data successfully saved! " + uri);

			}).catch(function(error) {
				console.log("ERROR", error);

			}).then(function() {
				fetchGroupDataScheduleRefresh(token, crowd_key, crowd_name, group_key, config);

			});

		} else {
			//
			// Otherwise, just schedule the refresh outright.
			//
			addToFacebookData(crowd_key, crowd_name, group_key, stats_data);
			debug("Group data successfully saved! " + uri);
			fetchGroupDataScheduleRefresh(token, crowd_key, crowd_name, group_key, config);
		}

	});


} // End of fetchGroupData()


/**
* Download pictures for our top users.
*
* @param string token Our auth token
* @param object config Our gorup configuration data
* @param object stats Our post/comment stats
*/
function fetchGroupDataTopUserPictures(token, config, stats, cb) {

	//
	// Get our user IDs and create an API query.
	// Note that Facebook counts each ID as a separate query against our quota.
	//
	var ids = [];
	for (var k in stats) {
		var user = stats[k];
		var id = user.user.id;
		ids.push(id);
	}

	var uri = "?ids=" + ids.join(",") + "&fields=id,name,picture";

	query(uri, token, config.retryInterval, function(err, data) {

		//
		// Create a hash table of our user IDs and pictures
		//
		var pictures = {};
		for (var k in data) {
			var id = data[k].id;
			var picture = data[k].picture.data.url;
			pictures[id] = picture;
		}

		//
		// Finally, go through our stats, and add a picture to each user.
		//
		for (var k in stats) {
			var user = stats[k].user;
			var picture = pictures[user.id];
			user.picture = picture; 
		}

		cb(null, stats);

	});

} // End of fetchGroupDataTopUserPictures()


/**
* Schedule the refresh of fetchGroupData()
*/
function fetchGroupDataScheduleRefresh(token, crowd_key, crowd_name, group_key, config) {

		debug("Refreshing data for crowd '" + crowd_key + "', group '" + group_key 
			+ "' again in " + config.refreshInterval + " seconds... " + JSON.stringify(config));
		setTimeout(function() {
			fetchGroupData(token, crowd_key, crowd_name, group_key, config);
			}, config.refreshInterval * 1000);

} // End of fetchGroupDataScheduleRefresh()


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
		userPhotos: config.userPhotos,
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



