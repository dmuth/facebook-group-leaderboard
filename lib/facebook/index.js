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


//
// Are the query loops running?
//
// This is either set to false or the time_t_ms of the last run.
// Yes, that's kinda non-obvious, but I didn't see the point of having two separate variables
// with two separate functions, either...
//
// I may revisit this in the future.
//
var is_running = false;


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
* Go through our top posters, and assign their posts.
*/
function addPostsToTopPosters(top_posters, posts) {

	for (var k in top_posters) {

		var poster = top_posters[k];

		if (posts[poster.user.id]) {
			poster.posts = posts[poster.user.id];
		}

	}

} // End of addPostsToTopPosters()


/**
* This function takes an array of top users, grabs the user ID, puts it into
* a hash table that maps the user ID to the index in the original array, and returns
* the hash table.
*/
function indexUserIds(users) {

	var retval = {};

	for (var k in users) {
		var user = users[k];
		var user_id = user.user.id;

		retval[user_id] = k;

	}

	return(retval);

} // End of indexUserIds()


/**
* Fetch our data from the group, including recent posts, then store it in our data structure.
*/
function fetchGroupData(tokens, crowd_key, crowd_name, group_key, config) {

	var queryAsync = Promise.promisify(query);

	var uri = config.id;
	var group_data;

	//
	// First, get a token to work with
	//
	tokens.get().then(function(data) {
		token = data.token;
		//token = "foobar"; // Debugging

		//
		// Now fetch the info for the group
		//
		return queryAsync(uri, token, config.retryInterval);
	}).then(function(data) {

		group_data = data;
		var id = data.id;

		//
		// Now fetch recent posts
		//
		var uri = id + "/feed?fields=from,created_time,message,story,comments&limit=" + config.numPosts;

		return queryAsync(uri, token, config.retryInterval);

	}).then(function(data) {

		//
		// Update the time of our last successful query
		//
		is_running = new Date().getTime();

		var post_stats = new stats();
		var comment_stats = new stats();

		//
		// Store our posts so that we can pair them to top posters later.
		//
		var posts = {};

		//
		// Add our posts and comments to the stats
		//
		for (var key in data.data) {

			var post = data.data[key];
			var from = post.from;

			//
			// If we have user include, add this post into our posts object.
			// The reason for the conditional is because if you or the user have blocked
			// each other, 
			//
			if (from) {
				if (!posts[from.id]) {
					posts[from.id] = [];
				}
				posts[from.id].push(post);
			}


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
		addPostsToTopPosters(top_posters, posts);

		var stats_data = {
			id: group_data.id,
			name: group_data.name,
			crowd_name: crowd_name,
			post_stats: top_posters,
			//
			// Create a hash table of user IDs indexed to array offsets for the post_stats array
			//
			post_stats_users: indexUserIds(top_posters),
			comment_stats: top_commenters,
			//
			// Create a hash table of user IDs indexed to array offsets for the comment_stats array
			//
			comment_stats_users: indexUserIds(top_commenters),
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
				fetchGroupDataScheduleRefresh(tokens, crowd_key, crowd_name, group_key, config);

			});

		} else {
			//
			// Otherwise, just schedule the refresh outright.
			//
			addToFacebookData(crowd_key, crowd_name, group_key, stats_data);
			debug("Group data successfully saved! " + uri);
			fetchGroupDataScheduleRefresh(tokens, crowd_key, crowd_name, group_key, config);
		}

	}).catch(function(error) {
		debug("ERROR in query: " + error + ", trying again in " + config.retryInterval + " seconds.");
		setTimeout(function() {
			fetchGroupData(tokens, crowd_key, crowd_name, group_key, config);
		}, config.retryInterval * 1000);

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

	var queryAsync = Promise.promisify(query);
	queryAsync(uri, token, config.retryInterval).then(function(data) {

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

	}).catch(function(error) {
		cb(error);

	});

} // End of fetchGroupDataTopUserPictures()


/**
* Schedule the refresh of fetchGroupData()
*/
function fetchGroupDataScheduleRefresh(tokens, crowd_key, crowd_name, group_key, config) {

		debug("Refreshing data for crowd '" + crowd_key + "', group '" + group_key 
			+ "' again in " + config.refreshInterval + " seconds... " + JSON.stringify(config));
		setTimeout(function() {
			fetchGroupData(tokens, crowd_key, crowd_name, group_key, config);
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


/**
* Our object constructor.
*/
var obj = function(config, tokens) {
	this.config = config;
	this.tokens = tokens;
}


/**
* Return the is_running boolean.
*/
obj.prototype.isRunning = function() {
	return(is_running);
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


/**
* This function starts our queries.  One query loop will be started
* per group that is being monitored.
*/
function startQueries(config, tokens) {
	return new Promise(function(resolve, reject) {

	var crowds = config.crowds;
	var retryInterval = config.retryInterval;
	var numPosts = config.numPosts;
	var numTopPosters = config.numTopPosters;
	var numTopCommenters = config.numTopCommenters;

	for (var crowds_key in crowds) {

		var groups = crowds[crowds_key];
		var crowd_name = crowds[crowds_key].name;

		for (groups_key in groups.groups) {

			var group = groups.groups[groups_key];

			//
			// Load our default configuration options, and then override them 
			// with anything specific for this group.
			//
			var group_config = getGroupConfig(config, group);

			(function(crowds_key, crowd_name, groups_key, group_config) {
				setImmediate(function() {
					debug("Spawning worker for crowd '" + crowds_key + "', group '" + groups_key + "', config: %s", JSON.stringify(group_config));
					fetchGroupData(tokens, crowds_key, crowd_name, groups_key, group_config);
					});
			})(crowds_key, crowd_name, groups_key, group_config)

		}

	}

	resolve();

	});
} // End of startQueries()


//
// Our main entry point.
//
obj.prototype.go = function() {

	var config = this.config;
	var tokens = this.tokens;

	tokens.load().then(function() {
		return tokens.count()

	}).then(function(num) {
		debug("Tokens loaded!");

		if (num <= 0) {
			debug("No tokens found, not starting up query loop yet.  Please log into Facebook via the web browser first!");

		} else {
	
			startQueries(config, tokens).then(function() {
				debug("Queries started");

			}).catch(function(error) {
				debug("ERROR", error);

			});

		}

	}).catch(function(error) {
		debug("ERROR", error);

	});


} // End of go()


module.exports = function(config, tokens) {
	return(new obj(config, tokens));
}



