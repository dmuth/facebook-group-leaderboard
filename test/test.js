/**
* Our unit tests
* Based on ideas at:
*
*	http://webapplog.com/mocha-test/
*	https://codeforgeek.com/2015/07/unit-testing-nodejs-application-using-mocha/
*
*/


var request = require('supertest');
var should = require("should");
var tokens = require("../lib/tokens");


describe("Token handling", function () {

	var server;


	beforeEach(function (done) {
		//server = require("../app");

		var token = new tokens();

		token.unlink().then(function() {
			done();

		}).catch(function(err) {
			done(err);

		});

	});


	afterEach(function (done) {
		//delete server;

		var token = new tokens();

		token.unlink().then(function() {
			done();
		}).catch(function(err) {
			done(err);
		});

	});


 	it("clear()", function(done) {

		var token = new tokens();

		token.load().then(function() {
			token.put("test token", "test name", new Date().getTime() + 1000000);

		}).then(function() {
			return token.clear();

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(0);
			done();

		}).catch(function(error) {
			done(error);
		});


	});

 	it("get()", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.put("test token", "test name", new Date().getTime() + 1000000);

		}).then(function() {
			return token.put("test token2", "test name2", new Date().getTime() + 1000000);

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(2);

			return(token.get());

		}).then(function(data) {
			data.token.should.equal("test token");
			return(token.get());

		}).then(function(data) {
			data.token.should.equal("test token2");

			return(token.get());
		}).then(function(data) {
			data.token.should.equal("test token");

			done();

		}).catch(function(error) {
			done(error);

		});

	});
 
 	it("get() on empty list", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.get();

		}).then(function(data) {
			done("We shouldn't have gotten here!");

		}).catch(function(error) {
			error.should.equal("No tokens available!");
			done();

		});

	});
 

 	it("get() on expired data", function(done) {

		var token = new tokens();
		token.put("test token", "test name", new Date().getTime() ).then(function() {
			return token.put("test token2", "test name2", new Date().getTime() );

		}).then(function() {
			return(token.get());

		}).then(function() {
			done("We shouldn't have gotten here!");

		}).catch(function(error) {
			done();

		});

	});
 

 	it("get() on partially expired data", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.put("test token", "test name", new Date().getTime() );

		}).then(function() {
			return token.put("test token2", "test name2", new Date().getTime() );

		}).then(function() {
			return token.put("test token3", "test name3", new Date().getTime() + 1000000 );

		}).then(function() {
			return(token.get());

		}).then(function(data) {
			data.token.should.equal("test token3");
			done();

		}).catch(function(error) {
			done(error);

		});

	});
 

 	it("delete()", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.put("test token", new Date().getTime() + 1000000);

		}).then(function() {
			return token.put("test token2", new Date().getTime() + 1000000);

		}).then(function() {
			return token.put("test token3", new Date().getTime() + 1000000);

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(3);
			return token.delete("test token");

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(2);
			return token.get();

		}).then(function(data) {
			data.token.should.equal("test token2");
			return token.get();

		}).then(function(data) {
			data.token.should.equal("test token3");
			return token.get();

		}).then(function(data) {
			data.token.should.equal("test token2");
			return token.get();

		}).then(function(data) {
			data.token.should.equal("test token3");

			return token.delete("test not here");

		}).then(function() {
			done("we shouldn't be here");

		}).catch(function(error) {
			error.should.match(/^Could not find token/);
			done();

		});

	});
 

 	it("put with write contention()", function(done) {

		var token = new tokens();

		token.debugSetWriting(true);
		token.debugSetWriting(false);
	
		//
		// Prevent writes... briefly.
		//
		function lock() {
			var delay = 10;
			token.debugSetWriting(true);
			setTimeout(function() { token.debugSetWriting(false); }, delay);
		}

		lock();

		token.load().then(function() {
			return token.put("test token", "test name", new Date().getTime())

		}).then(function() {
			lock();
			return token.put("test token2", "test name2", new Date().getTime() + 1000000);

		}).then(function() {
			lock();
			return token.put("test token3", "test name3", new Date().getTime() + 1000000);

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(3);

			lock();
			return(token.get());

		}).then(function(data) {
			data.token.should.equal("test token2");
			return(token.get());

		}).then(function(data) {
			data.token.should.equal("test token3");

			return(token.get());
		}).then(function(data) {
			data.token.should.equal("test token2");

			lock();
			return(token.delete("test token2"));
		}).then(function() {

			return(token.count());
		}).then(function(num) {
			num.should.equal(1);

			lock();
			return(token.clear()); 
		}).then(function() {

			return(token.count());
		}).then(function(num) {
			num.should.equal(0);

			done();

		}).catch(function(error) {
			done(error);

		});

	});


	it("Error handling for load()", function(done) {

		var token = new tokens();
		token.count().then(function(num) {
			num.should.equal(0);

		}).catch(function(error) {
			error.should.match(/^Tokens not loaded!/);

		}).then(function() {
			return token.get();

		}).catch(function(error) {
			error.should.match(/^Tokens not loaded!/);

		}).then(function() {
			return token.put();

		}).catch(function(error) {
			error.should.match(/^Tokens not loaded!/);

		}).then(function() {
			return token.load();

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(0);

			done();

		}).catch(function(error) {
			done(error);

		});

	});
	

 	it("Delete tokens and make sure they are loaded again()", function(done) {

		var token = new tokens();
		var token2;

		token.load().then(function() {
			return token.put("test token", "test name", new Date().getTime() + 1000000);

		}).then(function() {
			return token.put("test token2", "test name2", new Date().getTime());

		}).then(function() {
			//
			// Simulate a new run
			//
			return token.debugDeleteObjTokens();

		}).then(function() {
			return token.load();

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(1);

			token2 = new tokens();
			return token.count();
		
		}).then(function(num) {
			num.should.equal(1);

			done();

		});

	});


	it("Call get() when there are no tokens", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.get();

		}).then(function(data) {
			done("We shouldn't be here!");

		}).catch(function(error) {
			error.should.match("No tokens available!");
			done();

		});

	});


	it("Call count() when there are no tokens", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(0);
			done();

		}).catch(function(error) {
			done(error);

		});

	});


	it("Call load() twice and make sure tokens aren't duplicated", function(done) {

		var token = new tokens();

		token.load().then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(0);
			return token.put("test token", "test name", new Date().getTime() + 1000000);

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(1);
			return token.load();

		}).then(function() {
			return token.count();

		}).then(function(num) {
			num.should.equal(1);
			done();

		}).catch(function(error) {
			done(error);

		});

	});

	it("load() after put(), then get()", function(done) {

		var token = new tokens();
		token.load().then(function() {
			return token.put("test token", "test name", new Date().getTime() + 1000000);

		}).then(function() {
			return token.load();

		}).then(function() {
			return token.get();

		}).then(function(data) {
			data.token.should.equal("test token");
			return token.count();

		}).then(function(num) {
			num.should.equal(1);

			done();

		}).catch(function(error) {
			done(error);

		});

	});


	it("Update token metadata", function(done) {

		var token = new tokens();
		var now = new Date().getTime();
		var expire = now + 1000000;

		var id;
		var lastTried = 0;
		var lastSuccessful = 0;

		token.load().then(function() {
			return token.put("test token", "test name", expire);

		}).then(function() {
			return token.put("test token2", "test name2", expire);

		}).then(function() {
			return token.get();

		}).then(function(data) {
			//
			// Grab our token metadata
			//
			data.token.should.equal("test token");
			data.expire.should.equal(expire);
			id = data.token;
			lastTried = data.lastTried;
			lastSuccessful = data.lastSuccessful;
			
			return token.updateLastTried(id);
		}).then(function() {

			return token.updateLastFailed(id);
		}).then(function() {

			return token.updateLastFailed(id);
		}).then(function() {

			return token.get();
		}).then(function() {

			return token.get();
		}).then(function(data) {
			data.numErrorsSinceLastSuccessful.should.equal(2);
			data.lastTried.should.be.greaterThan(lastTried);
			data.lastSuccessful.should.equal(lastSuccessful);

			return token.updateLastSuccessful(id);
		}).then(function() {

			return token.get();
		}).then(function() {

			return token.get();
		}).then(function(data) {
			data.numErrorsSinceLastSuccessful.should.equal(0);
			data.lastSuccessful.should.be.greaterThan(lastSuccessful);


			//
			// Now test our functions with bad token IDs
			//
			token.updateLastTried("foobar").then(function() {
				done("We shouldn't be here!");

			}).catch(function(error) {
				error.should.match(/Token ID.*not found!/);

				return token.updateLastFailed("foobar");

			}).then(function() {
				done("We shouldn't be here!");

			}).catch(function(error) {
				error.should.match(/Token ID.*not found!/);

				return token.updateLastSuccessful("foobar");

			}).then(function() {
				done("We shouldn't be here!");

			}).catch(function(error) {
				error.should.match(/Token ID.*not found!/);

				done();

			});

		}).catch(function(error) {
			done(error);
		});

	});


});


