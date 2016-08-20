/**
* This module is responsible for fetching our tokens and modifying them.
*
* Usage:
* var tokens_lib = require("path/to/tokens");
* var tokens = new tokens()
*
* Add a token:
*
* tokens.put("token", expiration_date_in_time_t_milliseconds).then(function() { ...
*
* Delete that token:
*
* tokens.delete("token").then(function() { ...
*
* Get a token from the array of tokens.  This token is guaranteed to not be expired.
* If any tokens are expired, this module will quietly rewrite what's on disk.
* If no valid tokens can be found, an error will be raised:
*
* tokens.get().then(function(data) { ... }).catch(function(error) { ... });
*
* Delete all tokens:
*
* tokens.clear().then(function() { ...
*
*/

var cache = require("persistent-cache");
var Promise = require("bluebird");
var debug = require("debug")("tokens");

//
// A global copy of our tokens.
// The main reason I am doing this is that we may have different objects that are
// touching tokens, and I'd rather have have a single source:w
//
// The "tokens" value is an array of our tokens
//
var obj_tokens = {tokens: []};

//
// Our key for accessing this via the persistent-cache module.
//
var obj_key = "tokens";

var obj = function() { }

obj.prototype.unlink = function() {

	return(new Promise(function(resolve, reject) {
		var tokens = cache();

		obj_tokens = {tokens: []};
		tokens.unlink(function(err) {

			if (err) {
				reject(err);
			}

			resolve();

		});

	}));

}  // End of unlink()


/**
* Add a new token.
* 
* @param string token Our token
* @param string name The user's name from Facebook
* @param integer expire Our expiration date in milliseconds time_t.
*/
obj.prototype.put = function(token, name, expire) {
	return(new Promise(function(resolve, reject) {

		//
		// Update the data structure
		//
		obj_tokens.tokens.push({
			token: token,
			name: name,
			expire: expire,
			});
		var tokens = cache();

		//
		// ...and write it to disk!
		//
		tokens.put(obj_key, obj_tokens, function(err) {

			if (err) {
				reject(err);
			}

			resolve();

		});

	}));

} // End of put()


/**
* Delete all of our tokens.
*/
obj.prototype.clear = function() {
	return(new Promise(function(resolve, reject) {

		var tokens = cache();
		obj_tokens = {tokens:[]};
		
		tokens.put(obj_key, obj_tokens, function(err) {
			if (err) {
				reject(err);
			}

			resolve();

			});

	}));

} // End of clear()


/**
* Tell us how many tokens we have
*/
obj.prototype.count = function() {
	return(new Promise(function(resolve, reject) {

		resolve(obj_tokens.tokens.length);

	}));

} // Endo of count()


/**
* This function does a fair bit under the hood!
* First, it grabs a token, then it rotates the array.
* The expiration date is also honored.
* The cached file on disk is NOT modified UNLESS there is an expired token.
* 
*/
obj.prototype.get = function() {
	return(new Promise(function(resolve, reject) {

		if (obj_tokens.tokens.length <= 0) {
			reject("No tokens available!");
			return(null);
		}

		var tokens = cache();
		var retval = obj_tokens.tokens.shift();

		//
		// Keep going until we get an expired token or make it of the end of the list
		//
		var expired = false;
		while (retval.expire <= new Date().getTime()) {
			
			expired = true;

			if (obj_tokens.tokens.length <= 0) {
				reject("No un-expired tokens avaiable!");
				return(null);
			}

			var retval = obj_tokens.tokens.shift();

		}

		//
		// Okay, we have a valid token!  Go head and push it back on the end, and return it.
		//
		obj_tokens.tokens.push(retval);

		//
		// Oh, if a token expired, go ahead and rewrite new array first
		//
		if (expired) {

			tokens.put(obj_key, obj_tokens, function(err) {

				if (err) {
					reject(err);
				}

				resolve(retval);

				});

		} else {
			//
			// No reiwrte?  Just return what we have then!
			//
			resolve(retval);

		}

	}));


} // End of get()


/**
* Delete a single token by value.
* Note that yes, we're going to have to go through the entire list O(n),
* but I think this is far far cheaper than keeping a separate hash table of tokens
* that gets repopulated on each call to get(), as this code is intended
* to be used in a read-heavy environment.
*
*/
obj.prototype.delete = function(delete_target) {
	return(new Promise(function(resolve, reject) {

		var tokens = cache();

		var new_tokens = [];
		var found = false;

		for (var k in obj_tokens.tokens) {
			var token = obj_tokens.tokens[k];

			if (token != delete_target) {
				new_tokens.push(token);
			} else {
				found = true;
			}

		}

		if (!found) {
			reject("Could not find token '" + delete_target + "'");
			return(null);
		}

		obj_tokens.tokens = new_tokens;
		tokens.put(obj_key, obj_tokens, function(err) {

			if (err) {
				reject(err);
			}

			resolve();

			});

	}));

} // End of delete()


module.exports = function() {
	return new(obj);
}

