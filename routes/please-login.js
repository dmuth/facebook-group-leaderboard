/**
* Endpoint for /please-login
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("app");

router.get('/', function(req, res, next) {

	res.render("please-login");

});

module.exports = router;

