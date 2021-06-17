const pool = require('./db.connection.js');
const express = require('express');
const app = express(); 
const request = require('request');
    
    
    var getOrdersUpdate = function() {
        
        app.get('/', function(req, res){
            console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {

            
            var headers = {
                'Authorization': `Bearer ${rows[0].access_token}`
            }

            var options = {
                url: 'https://api.tdameritrade.com/v1/accounts/787237720/orders?fromEnteredTime=2018-02-01&toEnteredTime=2018-03-24&status=FILLED',
                method: 'GET',
                headers: headers,
                        //POST Body params
                    // query: {
                    //     'maxResults': null,
                    //     'fromEnteredTime': '2018-02-01',
                    //     'toEnteredTime': '2018-03-24',
                    //     'status': 'FILLED'
                    // }
            }
            
            request(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {

                    authReply = JSON.parse(body);

                    // pool.query('INSERT INTO Tokens SET ?', {AccessToken: authReply.access_token, RefreshToken: authReply.refresh_token}, function (error, rows, fields) {
                    //     console.log('Both Tokens have been updated with new tokens')
                    // });

                    console.log(body);
                    
                }
            });
            
            function errorHandler (err, req, res, next) {
                res.status(500)
                res.render('error', { error: err })
            }

            });
        });
    };

    module.exports.getOrdersUpdate = getOrdersUpdate;