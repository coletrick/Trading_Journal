const pool = require('./db.connection.js');
const express = require('express');
const app = express(); 
const request = require('request');



app.get('/', function(req, res){

	var headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	}

	var options = {
                //see the Authentication API's Post Access Token method for more information
		url: 'https://api.tdameritrade.com/v1/oauth2/token',
		method: 'POST',
		headers: headers,
                //POST Body params
		form: {
            'grant_type': 'authorization_code',
            // 'refresh_token': `${authToken.access_token}`,
			'access_type': 'offline',
			'code': req.query.code, //get the code
			'client_id': 'golfer12@AMER.OAUTHAP',
			'redirect_uri': 'https://localhost:8000'
		}
	}
        

	request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {

			authReply = JSON.parse(body);

            pool.query("INSERT INTO Tokens (AccessToken, RefreshToken) VALUES ?", [authReply.access_token, authReply.refresh_token], function (error, rows, fields) {
                console.log('Both Tokens have been updated with new tokens')
            });

				console.log('new tokens' + "   " + body)



            // fs.writeFile('mainAuthToken.json', body, function (err) {
            //     if (err) throw err;
            //     console.log('Saved Auth');
            // });

            // fs.writeFile('accessToken.json', mainAuthToken.access_token, function(err) {
            //     if (err) throw err;
            //     console.log('Saved Main Token');
            // })

            res.send("It Worked!");

            
		}
	})
	
	function errorHandler (err, req, res, next) {
		res.status(500)
		res.render('error', { error: err })
    }

});

var insertToken = function(token) {
	console.log('function   ' + access + "   " + refresh)
	if (access) {	
		pool.query("INSERT INTO Tokens (AccessToken, RefreshToken) VALUES ?", [token], function (error, rows, fields) {
			console.log('New Access token has been inserted')
		});
	}
	if (refresh) {	
		pool.query("INSERT INTO Tokens (RefreshToken) VALUES ?", [refresh], function (error, rows, fields) {
			console.log('New Refresh token has been inserted')
		});
	}
};

var updateToken = function(access, refresh) {
	if (access) {
		pool.query("UPDATE Tokens SET AccessToken = ? WHERE ID = 1", [access], function (error, rows, fields) {
			console.log('New Access token has been updated')
		});
	}
	if (refresh) {
		pool.query("UPDATE Tokens SET RefreshToken = ? WHERE ID = 1", [refresh], function (error, rows, fields) {
			console.log('New refresh token has been udpated')
		});
	}
};






// pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
//     // console.log('Current Tokens  ' + rows[0].AccessToken)
//     // console.log('Current Tokens  ' + rows[0].RefreshToken)

//     if (rows.length === 0) {
//         insertToken(authReply);
//     }
//     else if (rows[0].AccessToken === null) {
//         insertToken(authReply.access_token, false);
//     }else if (rows[0].RefreshToken === null) {
//         insertToken(false, authReply.refresh_token);
//     }else if (rows[0].AccessToken !== undefined) {
//         updateToken(authReply.access_token, false);
//     }else if (rows[0].RefreshToken !== undefined) {
//         updateToken(false, authReply.refresh_token);
//     }

//     if (err) {
//         throw err;
//     }

// });