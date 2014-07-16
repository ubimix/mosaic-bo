var port = 3701;

var Mosaic = require('mosaic-commons');
require('./api/Mosaic.BO.Server');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

/* ------------------------------------------------------- */
// Creates and initializes an Express application
var app = express();
app.use(bodyParser.urlencoded({
    extended : false
}));
app.use(bodyParser.json());
app.use(cookieParser('optional secret string'));
app.use(express.static(__dirname + '/app'));

/* ------------------------------------------------------- */
var serverStub = new Mosaic.BO.Server({
    path : '/api',
});
serverStub.registerIn(app);

/* ------------------------------------------------------- */
// Start the server
app.listen(port);
console.log('http://localhost:3701/');
