/**
* This module is responsible for fetching our tokens and modifying them.
*
* Usage:
* var Tokens = require("path/to/tokens");
* var tokens = new Tokens()
* tokens.load().then(function() { ...
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
var obj_tokens = {tokens: [], loaded: false};


//
// Our key for accessing this via the persistent-cache module.
//
var obj_key = "tokens";


//
// This variable is set when a write is taking place.  That prevents
// multiple writes from happening at once.
//
var is_writing = false;


var obj = function() { }

obj.prototype.unlink = function() {

	return(new Promise(function(resolve, reject) {
		var tokens = cache();

		obj_tokens = {tokens: [], loaded: false};
		tokens.unlink(function(err) {

			if (err) {
				reject(err);
			}

			resolve();

		});

	}));

}  // End of unlink()


/**
* Debug function.  This is used to manually set our is_writing variable.
* Used for white-box unit testing.
*/
obj.prototype.debugSetWriting = function(value) {
	is_writing = value;
}



/**
* This function wraps any writes we do.
* The callback should be calling tokens.put(), and this function makes sure 
* that another callback isn't currently writing
*/
function tryWrite(cb) {

	if (is_writing) {
		var delay = 100;
		debug("Another callback is writing, trying again in " + delay + " ms");
		setTimeout(function() {
			tryWrite(cb);
			}, delay);
		return(null);
	}

	debug("Okay, we're good to write!");
	is_writing = true;

	cb();

	//
	// Yeah, we're firing our callback, THEN changing this back to false.
	// It's not strictly the best way to do it, but I can't think of any better
	// method ATM, since this callback resolves its own promise and then the caller
	// continues.
	//
	// I might have to re-visit this if I start seeing like, dozens of writes a second,
	// but honestly if that happens it's time to start using Redis.
	//
	is_writing = false;
	debug("Write complete");

} // End of tryWrite()


/**
* Add a new token.
* 
* @param string token Our token
* @param string name The user's name from Facebook
* @param integer expire Our expiration date in milliseconds time_t.
*/
obj.prototype.put = function(token, name, expire) {
	return(new Promise(function(resolve, reject) {

		if (!obj_tokens.loaded) {
			reject("Tokens not loaded!  Please call load() first!");
			return(null);
		}

		//
		// Wrap our code in a function and then pass it to to tryWrite()
		//
		var go = function() {

		//
		// Update the data structure
		//
		obj_tokens.tokens.push({
			token: token,
			name: name,
			expire: expire,
			});
		obj_tokens.loaded = true;
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

		} // End of go()

		tryWrite(go);

	}));

} // End of put()


/**
* Delete all of our tokens.
*/
obj.prototype.clear = function() {
	return(new Promise(function(resolve, reject) {

		//
		// Wrap our code in a function and then pass it to to tryWrite()
		//
		var go = function() {

		var tokens = cache();
		obj_tokens = {tokens:[]};
		obj_tokens.loaded = true;
		
		tokens.put(obj_key, obj_tokens, function(err) {
			if (err) {
				reject(err);
			}

			resolve();

			});

		} // End of go()

		tryWrite(go);

	}));

} // End of clear()


/**
* Tell us how many tokens we have
*/
obj.prototype.count = function() {
	return(new Promise(function(resolve, reject) {

		if (!obj_tokens.loaded) {
			reject("Tokens not loaded!  Please call load() first!");
			return(null);
		}

		resolve(obj_tokens.tokens.length);

	}));

} // End of count()


/**
* Load our data from disk, taking into account expired tokens.
* I had thought about doing this in the constructor, but I've always believed
* that constructors should be about assignment, and not about dealing with promises/callbacks.
*/
obj.prototype.load = function() {
	return(new Promise(function(resolve, reject) {

		debug("Loading tokens...");
		var tokens = cache();

		//
		// First, load our tokens
		//
		tokens.get(obj_key, function(err, data) {

			if (err) {
				reject(err);
			}

			//
			// Now, add only tokens that have NOT expired into our tokens list.
			//
			if (data && data.tokens) {
				for (var k in data.tokens) {

					var token = data.tokens[k];

					if (token.expire > new Date().getTime()) {
						obj_tokens.tokens.push(token);
					}

				}

			}

			obj_tokens.loaded = true;
			debug("Num tokens loaded: " + obj_tokens.tokens.length);

			//
			// Finally, write out our tokens, wrapped in tryWrite().
			//
			var go = function() {

			tokens.put(obj_key, obj_tokens, function(err) {

				if (err) {
					reject(err);
				}

				resolve();

				});

			} // End of go()

			tryWrite(go);

		});


	}));

} // End of load()


/**
* This function does a fair bit under the hood!
* First, it grabs a token, then it rotates the array.
* The expiration date is also honored.
* The cached file on disk is NOT modified UNLESS there is an expired token.
* 
*/
obj.prototype.get = function() {
	return(new Promise(function(resolve, reject) {

		if (!obj_tokens.loaded) {
			reject("Tokens not loaded!  Please call load() first!");
			return(null);
		}

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

			//
			// Wrap our code in a function and then pass it to to tryWrite()
			//
			var go = function() {

			tokens.put(obj_key, obj_tokens, function(err) {

				if (err) {
					reject(err);
				}

				resolve(retval);

				});

			} // End of go()

			tryWrite(go);

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

		//
		// Wrap our code in a function and then pass it to to tryWrite()
		//
		var go = function() {

		var tokens = cache();

		var new_tokens = [];
		var found = false;

		for (var k in obj_tokens.tokens) {
			var token = obj_tokens.tokens[k];

			if (token.token != delete_target) {
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
		obj_tokens.loaded = true;
		tokens.put(obj_key, obj_tokens, function(err) {

			if (err) {
				reject(err);
			}

			resolve();

			});

		} // End of go()

		tryWrite(go);

	}));

} // End of delete()


/**
* Ths function is used for white-box testing.  It deletes our
* obj_tokens tokens.
*/
obj.prototype.debugDeleteObjTokens = function() {
	return(new Promise(function(resolve, reject) {
		obj_tokens = {tokens:[]};
		obj_tokens.loaded = false;
		resolve();
	}));
} // End of debugDeleteObjTokens()


module.exports = function() {
	return new(obj);
}

