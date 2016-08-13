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


var obj = {

	stats: {},


	/**
	* Increment the user count.
	*/
	incr: function(user) {

		var key = user.id + ":" + user.name;
		if (!this.stats[key]) {
			this.stats[key] = {
				user: user,
				count: 0,
				};
		}

		this.stats[key].count++;

	},


	/**
	* Get top users.
	*
	* @param integer num The number of users to get.
	*
	* @return array of users and the number of posts from each user.
	*/
	getTop: function(num) {

		var retval = [];

		//
		// Get a list of our users by count.
		//
		var counts = {};

		for (var key in this.stats) {
			var stat = this.stats[key];
			var user = stat.user;
			var count = stat.count;

			if (!counts[count]) {
				counts[count] = [];
			}

			counts[count].push(user);

		}

		//
		// Objects are unordered, so get the keys, reverse sort them, and take the top num keys.
		// That will give us a minimum of num users.
		//
		var keys = Object.keys(counts);
		keys.sort();
		keys.reverse();
		keys = keys.slice(0, num);

		//
		// Go through our keys, sort each group of users, and grab as many users as we can
		// up to our total number requested.
		//
		for (var key in keys) {

			var count = keys[key];
			var users = counts[count];

			users.sort(function(a, b) {

				if (a.name < b.name) {
					return(-1);

				} else if (a.name > b.name) {
					return(1);

				}

				return(0);

				});

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

	}

}


module.exports = function() {
	return(obj);
}

