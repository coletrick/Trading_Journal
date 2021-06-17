// 'use strict'

const pool = require('./db.connection.js');
const express = require('express');
const app = express();                 
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const https = require('https');
const request = require('request');
var dateTime = require('node-datetime');
var dateFormat = require('dateformat');
var getDbUpdates = require('./getDbUpdates.js');



var privateKey = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('certificate.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};



app.set('view engine', 'pug');
app.set ('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));





// app.get('/trans', function(req, res){

    
// 	var headers = {
// 		// 'Authorization': `Bearer ${authToken.access_token}`
// 	}

// 	var options = {
//                 //see the Authentication API's Post Access Token method for more information
// 		url: 'https://api.tdameritrade.com/v1/accounts/787237720/transactions',
// 		method: 'GET',
// 		headers: headers,
//                 //POST Body params
// 		query: {
// 			'type': 'TRADE',
// 			'symbol': null,
// 			'startDate': null,
//             'endDate': null
// 		}
//     }
    
     
//     var stuff;
// 	request(options, function(error, response, body) {
//         if (!error && response.statusCode == 200) {

//         }

//         var authReply = JSON.parse(body);
// 		stuff = JSON.parse(body);
		


//         res.render('trans', { GoodStuff: stuff, TimeCreate: dateTime })
// 	})
	
// 	function errorHandler (err, req, res, next) {
// 		res.status(500)
// 		res.render('error', { error: err })
// 	}


// 	pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
// 		if (rows.length === 0) {
// 			insertToken();
// 		}
// 		if (rows.length > 0) {
// 			updateToken();
// 		}
// 	});






	// console.log("token variable" + " " + tokensTable)

	// if (tokensTable === undefined) {
	// 	pool.query("INSERT INTO Tokens (AccessToken) VALUES ('hey')", function (error, rows, fields) {
	// 		console.log('insert')
	// 	});	
	// }

	// if (tokensTable !== undefined) {
	// 	pool.query("UPDATE Tokens SET AccessToken", "Foo", function (error, rows, fields) {
	// 		console.log('update')	
	// 	});	
	// }
	



	// pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
	// 	console.log('first here!')
	// 	if (err) {
	// 		console.log("yo" + " " + err)
	// 	}
	// 	if (rows === null || rows === undefined) {
	// 		pool.query("INSERT INTO Tokens SET AccessToken", ["Hey"], function (error, rows, fields) {
	// 			console.log('here!')
	// 			if (error) throw error;
	// 		});
	// 	} else {
	// 		pool.query("UPDATE Tokens SET AccessToken", ["Hey"], function (error, rows, fields) {
	// 			console.log('here! Here')
	// 			if (error) throw error;
	// 		});
	// 	}
	// });
	
	// pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
	// 	if (rows === null || rows === undefined) {
	// 		pool.query("INSERT INTO Tokens SET RefreshToken", ["Bro"], function (error, rows, fields) {
	// 			if (error) throw error;
	// 		});
	// 	} else {
	// 		pool.query("UPDATE Tokens SET RccessToken", ["Bro"], function (error, rows, fields) {
	// 			if (error) throw error;
	// 		});
	// 	}
	// });




// });


// app.get('/orders', function(req, res){

    
// 	var headers = {
// 		// 'Authorization': `Bearer ${authToken.access_token}`
// 	}

// 	var options = {
// 		url: 'https://api.tdameritrade.com/v1/accounts/787237720/orders?fromEnteredTime=2018-02-01&toEnteredTime=2018-03-24&status=FILLED',
// 		method: 'GET',
// 		headers: headers,
//                 //POST Body params
//             // query: {
//             //     'maxResults': null,
//             //     'fromEnteredTime': '2018-02-01',
//             //     'toEnteredTime': '2018-03-24',
//             //     'status': 'FILLED'
//             // }
// 	}
     
//     var orders;
// 	request(options, function(error, response, body) {
// 		if (!error && response.statusCode == 200) {

//         }

//         var authReply = JSON.parse(body);
//         orders = JSON.parse(body);
//         // console.log(orders);
        
//         res.render('orders', { GoodOrders: orders, TimeCreate: dateTime })
// 	})
	
// 	function errorHandler (err, req, res, next) {
// 		res.status(500)
// 		res.render('error', { error: err })
//     }
// });

// var ordersBuilderFunc = function(dbFields) {
// 	pool.query('INSERT INTO Orders SET ?', [dbFields], function (error, rows, fields) {

// 	});
// };


// 	app.get('/', function(req, res){
// 		console.log('getOrdersUpdate');
// 		pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
		
// 			var headers = {
// 				'Authorization': `Bearer ${rows[0].AccessToken}`
// 			}

// 			var options = {
// 				url: 'https://api.tdameritrade.com/v1/accounts/787237720/orders?fromEnteredTime=2017-02-01&toEnteredTime=2018-03-31&status=FILLED',
// 				method: 'GET',
// 				headers: headers,
// 						//POST Body params
// 					// query: {
// 					//     'maxResults': null,
// 					//     'fromEnteredTime': '2018-02-01',
// 					//     'toEnteredTime': '2018-03-24',
// 					//     'status': 'FILLED'
// 					// }
// 			}
			
// 			request(options, function(error, response, body) {
				
// 				if (!error && response.statusCode == 200) {

// 					var ordersReply = JSON.parse(body);

// 						for (var x = 0; x < ordersReply.length; x++) {
// 							var ordersSetDbFields = {};

// 							ordersSetDbFields.OrderType = ordersReply[x].orderType;
// 							ordersSetDbFields.ComplexOrderStrategyType = ordersReply[x].complexOrderStrategyType;
// 							ordersSetDbFields.OrderFilledQuantity = ordersReply[x].filledQuantity;
// 							ordersSetDbFields.OrderOpenPrice = ordersReply[x].price;
// 							ordersSetDbFields.OrderId = ordersReply[x].orderId;
// 							ordersSetDbFields.OrderStatus = ordersReply[x].status;
// 							ordersSetDbFields.CloseTime = ordersReply[x].closeTime;
// 							ordersSetDbFields.AccountId = ordersReply[x].accountId;


// 							for (var i = 0; i < ordersReply[x].orderLegCollection.length; i++) {
// 								var legNumOrderLegType = 'Leg' + (i + 1) + 'OrderLegType';
// 								var legNumId = 'Leg' + (i + 1) + 'Id';
// 								var legNumAssetType = 'Leg' + (i + 1) + 'AssetType';
// 								var legNumCusip = 'Leg' + (i + 1) + 'Cusip';
// 								var legNumSymbol = 'Leg' + (i + 1) + 'Symbol';
// 								var legNumDescription = 'Leg' + (i + 1) + 'Description';
// 								var legNumInstruction = 'Leg' + (i + 1) + 'Instruction';
// 								var legNumPositionEffect = 'Leg' + (i + 1) + 'PositionEffect';
// 								var legNumQuantity = 'Leg' + (i + 1) + 'Quantity';
// 								var legNumPrice = 'Leg' + (i + 1) + 'Price';
// 								var legNumOrderTime = 'Leg' + (i + 1) + 'OrderTime';


// 								if (ordersReply[x].orderLegCollection.length > 1 ) {

// 									ordersSetDbFields[legNumOrderLegType] = ordersReply[x].orderLegCollection[i].orderLegType;
// 									ordersSetDbFields[legNumId] = ordersReply[x].orderLegCollection[i].legId;
// 									ordersSetDbFields[legNumAssetType] = ordersReply[x].orderLegCollection[i].instrument.assetType;
// 									ordersSetDbFields[legNumCusip] = ordersReply[x].orderLegCollection[i].instrument.cusip;
// 									ordersSetDbFields[legNumSymbol] = ordersReply[x].orderLegCollection[i].instrument.symbol;
// 									ordersSetDbFields[legNumDescription] = ordersReply[x].orderLegCollection[i].instrument.description;
// 									ordersSetDbFields[legNumInstruction] = ordersReply[x].orderLegCollection[i].instruction;
// 									ordersSetDbFields[legNumPositionEffect] = ordersReply[x].orderLegCollection[i].positionEffect;
// 									ordersSetDbFields[legNumQuantity] = ordersReply[x].orderLegCollection[i].quantity;
// 									ordersSetDbFields[legNumPrice] = ordersReply[x].orderActivityCollection[0].executionLegs[i].price;
// 									ordersSetDbFields[legNumOrderTime] = ordersReply[x].orderActivityCollection[0].executionLegs[i].time;
// 								}

// 								if (ordersReply[x].orderLegCollection.length <= 1 ) {

// 									ordersSetDbFields[legNumOrderLegType] = ordersReply[x].orderLegCollection[0].orderLegType;
// 									ordersSetDbFields[legNumId] = ordersReply[x].orderLegCollection[0].legId;
// 									ordersSetDbFields[legNumAssetType] = ordersReply[x].orderLegCollection[0].instrument.assetType;
// 									ordersSetDbFields[legNumCusip] = ordersReply[x].orderLegCollection[0].instrument.cusip;
// 									ordersSetDbFields[legNumSymbol] = ordersReply[x].orderLegCollection[0].instrument.symbol;
// 									ordersSetDbFields[legNumDescription] = ordersReply[x].orderLegCollection[0].instrument.description;
// 									ordersSetDbFields[legNumInstruction] = ordersReply[x].orderLegCollection[0].instruction;
// 									ordersSetDbFields[legNumPositionEffect] = ordersReply[x].orderLegCollection[0].positionEffect;
// 									ordersSetDbFields[legNumQuantity] = ordersReply[x].orderLegCollection[0].quantity;
// 									ordersSetDbFields[legNumPrice] = ordersReply[x].orderActivityCollection[0].executionLegs[0].price;
// 									ordersSetDbFields[legNumOrderTime] = ordersReply[x].orderActivityCollection[0].executionLegs[0].time;
// 								}

// 							}
// 							ordersBuilderFunc(ordersSetDbFields);
// 					}	
// 				}
// 			});
			
// 			function errorHandler (err, req, res, next) {
// 				res.status(500)
// 				res.render('error', { error: err })
// 			}

// 		});

// 		res.render('index');
// 	});





// var transBuilderFunc = function(dbFields) {
// 	pool.query('INSERT INTO Transactions SET ?', [dbFields], function (error, rows, fields) {

// 	});
// };


// 	app.get('/', function(req, res){
// 		console.log('Get Transactions');
// 		pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
		
// 			var headers = {
// 				'Authorization': `Bearer ${rows[0].AccessToken}`
// 			}

// 			var options = {
// 				url: 'https://api.tdameritrade.com/v1/accounts/787237720/transactions',
// 				method: 'GET',
// 				headers: headers,
// 				query: {
// 					'type': 'TRADE',
// 					'symbol': null,
// 					'startDate': null,
// 					'endDate': null
// 				}
// 			}
			
// 			request(options, function(error, response, body) {
				
// 				if (!error && response.statusCode == 200) {

// 					var transReply = JSON.parse(body);

// 					console.log(transReply)

					// 	for (var x = 0; x < transReply.length; x++) {
					// 		var transSetDbFields = {};

					// 		transSetDbFields.TransType = transReply[x].type;
					// 		transSetDbFields.SubAccount = transReply[x].subAccount;
					// 		transSetDbFields.OrderId = transReply[x].orderId;
					// 		transSetDbFields.OrderOpenPrice = transReply[x].price;
					// 		transSetDbFields.OrderId = transReply[x].orderId;
					// 		transSetDbFields.OrderStatus = transReply[x].status;
					// 		transSetDbFields.CloseTime = transReply[x].closeTime;
					// 		transSetDbFields.AccountId = transReply[x].accountId;


					// 		for (var i = 0; i < transReply[x].orderLegCollection.length; i++) {
					// 			var legNumOrderLegType = 'Leg' + (i + 1) + 'OrderLegType';
					// 			var legNumId = 'Leg' + (i + 1) + 'Id';
					// 			var legNumAssetType = 'Leg' + (i + 1) + 'AssetType';
					// 			var legNumCusip = 'Leg' + (i + 1) + 'Cusip';
					// 			var legNumSymbol = 'Leg' + (i + 1) + 'Symbol';
					// 			var legNumDescription = 'Leg' + (i + 1) + 'Description';
					// 			var legNumInstruction = 'Leg' + (i + 1) + 'Instruction';
					// 			var legNumPositionEffect = 'Leg' + (i + 1) + 'PositionEffect';
					// 			var legNumQuantity = 'Leg' + (i + 1) + 'Quantity';
					// 			var legNumPrice = 'Leg' + (i + 1) + 'Price';
					// 			var legNumOrderTime = 'Leg' + (i + 1) + 'OrderTime';


					// 			if (transReply[x].orderLegCollection.length > 1 ) {

					// 				ordersSetDbFields[legNumOrderLegType] = transReply[x].orderLegCollection[i].orderLegType;
					// 				ordersSetDbFields[legNumId] = transReply[x].orderLegCollection[i].legId;
					// 				ordersSetDbFields[legNumAssetType] = transReply[x].orderLegCollection[i].instrument.assetType;
					// 				ordersSetDbFields[legNumCusip] = transReply[x].orderLegCollection[i].instrument.cusip;
					// 				ordersSetDbFields[legNumSymbol] = transReply[x].orderLegCollection[i].instrument.symbol;
					// 				ordersSetDbFields[legNumDescription] = transReply[x].orderLegCollection[i].instrument.description;
					// 				ordersSetDbFields[legNumInstruction] = transReply[x].orderLegCollection[i].instruction;
					// 				ordersSetDbFields[legNumPositionEffect] = transReply[x].orderLegCollection[i].positionEffect;
					// 				ordersSetDbFields[legNumQuantity] = transReply[x].orderLegCollection[i].quantity;
					// 				ordersSetDbFields[legNumPrice] = transReply[x].orderActivityCollection[0].executionLegs[i].price;
					// 				ordersSetDbFields[legNumOrderTime] = transReply[x].orderActivityCollection[0].executionLegs[i].time;
					// 			}

					// 			if (transReply[x].orderLegCollection.length <= 1 ) {

					// 				ordersSetDbFields[legNumOrderLegType] = transReply[x].orderLegCollection[0].orderLegType;
					// 				ordersSetDbFields[legNumId] = transReply[x].orderLegCollection[0].legId;
					// 				ordersSetDbFields[legNumAssetType] = transReply[x].orderLegCollection[0].instrument.assetType;
					// 				ordersSetDbFields[legNumCusip] = transReply[x].orderLegCollection[0].instrument.cusip;
					// 				ordersSetDbFields[legNumSymbol] = transReply[x].orderLegCollection[0].instrument.symbol;
					// 				ordersSetDbFields[legNumDescription] = transReply[x].orderLegCollection[0].instrument.description;
					// 				ordersSetDbFields[legNumInstruction] = transReply[x].orderLegCollection[0].instruction;
					// 				ordersSetDbFields[legNumPositionEffect] = transReply[x].orderLegCollection[0].positionEffect;
					// 				ordersSetDbFields[legNumQuantity] = transReply[x].orderLegCollection[0].quantity;
					// 				ordersSetDbFields[legNumPrice] = transReply[x].orderActivityCollection[0].executionLegs[0].price;
					// 				ordersSetDbFields[legNumOrderTime] = transReply[x].orderActivityCollection[0].executionLegs[0].time;
					// 			}

					// 		}
					// 		ordersBuilderFunc(ordersSetDbFields);
					// }	
	// 			}
	// 		});
			
	// 		function errorHandler (err, req, res, next) {
	// 			res.status(500)
	// 			res.render('error', { error: err })
	// 		}

	// 	});

	// 	res.render('index');
	// });










app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));




// var httpServer = http.createServer(app);


// //Set to 8080, but can be any port, code will only come over https, even if you specified http in your Redirect URI
// httpServer.listen(8080);




const baseRouter = require('./routes/base.routes.js')(express.Router());
// const tradesRouter = require('./routes/trades.routes.js')(express.Router());
const newTradesRouter = require('./routes/trades_new.routes.js')(express.Router());
// const newTradeSetup = require('./routes/new.routes.js')(express.Router());
const getAuth = require('./routes/getAuth.routes.js')(express.Router());
const trans = require('./routes/trans.routes.js')(express.Router());

getDbUpdates.getOrdersUpdate();

app.use('/', baseRouter);
// app.use('/', tradesRouter);
app.use('/', newTradesRouter);
// app.use('/', newTradeSetup);
app.use('/', getAuth);
app.use('/', trans);

app.listen(8080, function() {
    console.log("OWT Trading on port 8080");
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8000, function() {
    console.log("OWT Trading on SSL port 8000");
});








// const express = require('express');
// const app = express();                 
// const bodyParser = require('body-parser');


// app.set('view engine', 'pug');
// app.set ('views', __dirname + '/views');
// app.use(express.static(__dirname + '/public'));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));


// const baseRouter = require('./routes/base.routes.js')(express.Router());
// const tradesRouter = require('./routes/trades.routes.js')(express.Router());
// const getAuth = require('./routes/getAuth.routes.js')(express.Router());

// app.use('/', baseRouter);
// app.use('/', tradesRouter);
// app.use('/', getAuth);

// app.listen(8080, function() {
//     console.log("OWT Trading on port 8080");
// });






