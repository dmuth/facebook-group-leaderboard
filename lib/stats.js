/**
* This module returns an object which is used for getting poster stats.
* Specifically, the code is Facebook Graph-aware.
*
* Usage:
* 
* var stats = require("./path/to/stats");
* var s = new Stats();
*
* var user = {name: "name", id: "id"};
* s.incr(user);
* var top_ten = s.getTop(10);
*
*/


var obj = function() {
	this.stats = {};
}


/**
* Increment the user count.
*/
obj.prototype.incr = function(user) {

	var key = user.id + ":" + user.name;
	if (!this.stats[key]) {
		this.stats[key] = {
			user: user,
			count: 0,
			};
	}

	this.stats[key].count++;

}


/**
* Take our users and group them into an object by the number of posts/comments
* each user has made.
*
* @return object The key is the number of posts/comments and the value is an array of users.
*/
obj.prototype.getUsersByCount = function() {

	var retval = {};

	for (var key in this.stats) {
		var stat = this.stats[key];
		var user = stat.user;
		var count = stat.count;

		if (!retval[count]) {
			retval[count] = [];
		}

		retval[count].push(user);

	}

	return(retval);

} // End of getUsersByCount()


/**
* Get the top num keys.  Since we have at least 1 user key user,
* this guarantees us that we'll get the number of users we want.
* Chances are that we'll have some ties, through, so we'll get just
* the users we want at a later step.
*
* @param object Our users grouped by count
*/
obj.prototype.getTopKeys = function(counts, num) {

	//
	// Objects are unordered, so get the keys, reverse sort them, and take the top num keys.
	// That will give us a minimum of num users.
	//
	var keys = Object.keys(counts);
	keys.sort();
	keys.reverse();
	keys = keys.slice(0, num);

	return(keys);

} // End of getTopKeys()


/**
* Sort an array of user objects based on the name of each user.
*/
obj.prototype.sortUsers = function(users) {

		users.sort(function(a, b) {

			if (a.name < b.name) {
				return(-1);

			} else if (a.name > b.name) {
				return(1);

			}

			return(0);

			});

	return(users);

} // End of sortUsers()


/**
* Get top users.
*
* @param integer num The number of users to get.
*
* @return array of users and the number of posts from each user.
*/
obj.prototype.getTop = function(num) {

	var retval = [];

	//
	// Get a list of our users by count.
	//
	var counts = this.getUsersByCount();

	var keys = this.getTopKeys(counts, num);

	//
	// Go through our keys, sort each group of users, and grab as many users as we can
	// up to our total number requested.
	//
	for (var key in keys) {

		var count = keys[key];
		var users = this.sortUsers(counts[count]);

		//
		// Go through our users and grab as many as we can until we 
		// exhaust the number of users we wanted.
		//
		for (var key2 in users) {

			var user = users[key2];
			
			if (num > 0) {
				retval.push({
					user: user,
					count: count
					});
				num--;
					
			} else {
				break;

			}

		}

		if (num <= 0) {
			break;
		}

	}

	return(retval);

} // End of getTop()


module.exports = function() {
	return(new (obj));
}


