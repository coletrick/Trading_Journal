const pool = require('../db.connection.js');
const express = require('express');
const app = express(); 
const request = require('request');


module.exports = function(router) {

    var getAuthToken = function(req, res) {
    
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        var options = {
            url: 'https://api.tdameritrade.com/v1/oauth2/token',
            method: 'POST',
            headers: headers,
            form: {
                'grant_type': 'authorization_code',
                // 'refresh_token': `${authToken.access_token}`,
                'access_type': 'offline',
                'code': req.query.code,
                'client_id': '',
                'redirect_uri': 'https://localhost:8000/auth'
            }
        }
            

        request(options, function(error, response, body) {
            if (!error && response.statusCode == 200) {

                authReply = JSON.parse(body);

                pool.query('INSERT INTO Tokens SET ?', {AccessToken: authReply.access_token, RefreshToken: authReply.refresh_token}, function (error, rows, fields) {
                    console.log('Both Tokens have been updated with new tokens')
                });

                console.log('new tokens' + "   " + body)

                // res.render('auth', {  });

                
            }
        });
        
        function errorHandler (err, req, res, next) {
            res.status(500)
            res.render('error', { error: err })
        }

    };


    var getTokenRefresh = function(req, res) {


        pool.query('SELECT * FROM Tokens', function(err, rows, fields) { 

            // console.log(rows[0].RefreshToken);
            
            if (err) throw err;
    
            var headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            var options = {
                url: 'https://api.tdameritrade.com/v1/oauth2/token',
                method: 'POST',
                headers: headers,
                form: {
                    'grant_type': 'refresh_token',
                    'refresh_token': rows[0].RefreshToken,
                    'client_id': '',
                }
            }
                

            request(options, function(error, response, body) {

                if (error) throw error;

                if (!error && response.statusCode == 200) {

                    authReply = JSON.parse(body);

                    // var currentTime = new Date;

                    pool.query('UPDATE Tokens SET ?', {AccessToken: authReply.access_token, RefreshTimeStamp: new Date}, function (error, rows, fields) {

                        if (error) throw error;

                        console.log('Refresh Token has been udpated this is the getAuth page')
                    });

                    console.log('new refresh' + "   " + body)

                    // res.render('refresh', {  });

                    
                }
            });
            
            function errorHandler (err, req, res, next) {
                res.status(500)
                res.render('error', { error: err })
            }
        });  

    };



    // router.route('/auth').get(getAuthToken);
    // router.route('/refresh').get(getTokenRefresh);

    module.exports.getTokenRefresh = getTokenRefresh;

    return router;
};






