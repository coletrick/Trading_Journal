const dateTime = require('node-datetime');
var dateFormat = require('dateformat');
const pool = require('../db.connection.js');
const request = require('request');

module.exports = function(router) {

    var getTradesByCloseDate = function(req, res) {
            
            var categoryType = req.query.category;


                // console.log('getOrdersUpdate');
                pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
                
                    var headers = {
                        'Authorization': `Bearer ${rows[0].AccessToken}`
                    }
        
                    var options = {
                        url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-05-01&toEnteredTime=2018-12-03&status=FILLED',
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

                            var openTradesArr = [];
                            var closingTradesArr = [];
        
                            // var ordersReply = JSON.parse(body);
                            var ordersInfo = JSON.parse(body);

                            // console.log(ordersInfo.length)
                            
                            for (var x = 0; x < ordersInfo.length; x++) {
                                var openTrade;
                                var openTradesCounter = 0;
                                if (ordersInfo[x].orderLegCollection[0].positionEffect === "OPENING") {
                                    openTradesCounter++;
                                    openTrade = {
                                                Price: ordersInfo[x].price,
                                                OpenQuantity: ordersInfo[x].filledQuantity,
                                                OpenDate: ordersInfo[x].closeTime,
                                                OrderType: ordersInfo[x].complexOrderStrategyType,
                                                OpeningOrClosing: ordersInfo[x].orderLegCollection[0].positionEffect,
                                                OpenTradeId: openTradesCounter
                                                
                                    };

                                    // console.log(ordersInfo[0].orderLegCollection.length)

                                    for (var e = 0; e < ordersInfo[x].orderLegCollection.length; e++) {
                                        openTrade.LegId1 = ordersInfo[x].orderLegCollection[e].legId;
                                        openTrade.Cusip1 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                        openTrade.Symbol1 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                        openTrade.Description1 = ordersInfo[x].orderLegCollection[e].instrument.description;

                                        if (ordersInfo[x].orderLegCollection.length > 1) {
                                            openTrade.LegId2 = ordersInfo[x].orderLegCollection[e].legId;
                                            openTrade.cusip2 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            openTrade.Symbol2 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            openTrade.Description2 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        if (ordersInfo[x].orderLegCollection.length > 2) {
                                            openTrade.LegId3 = ordersInfo[x].orderLegCollection[e].legId;
                                            openTrade.Cusip3 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            openTrade.Symbol3 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            openTrade.Description3 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        if (ordersInfo[x].orderLegCollection.length > 3) {
                                            openTrade.LegId4 = ordersInfo[x].orderLegCollection[e].legId;
                                            openTrade.Cusip4 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            openTrade.Symbol4 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            openTrade.Description4 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        
                                        

                                    }

                                    openTradesArr.push(openTrade);

                                }
                            }

                            for (var x = 0; x < ordersInfo.length; x++) {
                                var closingTrades;
                                if (ordersInfo[x].orderLegCollection[0].positionEffect === "CLOSING") {

                                    closingTrades = {
                                                Price: ordersInfo[x].price,
                                                OpenQuantity: ordersInfo[x].filledQuantity,
                                                OpenDate: ordersInfo[x].closeTime,
                                                OrderType: ordersInfo[x].complexOrderStrategyType,
                                                OpeningOrClosing: ordersInfo[x].orderLegCollection[0].positionEffect
                                                
                                    };

                                    // console.log(ordersInfo[0].orderLegCollection.length)

                                    for (var e = 0; e < ordersInfo[x].orderLegCollection.length; e++) {
                                        closingTrades.LegId1 = ordersInfo[x].orderLegCollection[e].legId;
                                        closingTrades.Cusip1 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                        closingTrades.Symbol1 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                        closingTrades.Description1 = ordersInfo[x].orderLegCollection[e].instrument.description;

                                        if (ordersInfo[x].orderLegCollection.length > 1) {
                                            closingTrades.LegId2 = ordersInfo[x].orderLegCollection[e].legId;
                                            closingTrades.cusip2 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            closingTrades.Symbol2 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            closingTrades.Description2 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        if (ordersInfo[x].orderLegCollection.length > 2) {
                                            closingTrades.LegId3 = ordersInfo[x].orderLegCollection[e].legId;
                                            closingTrades.Cusip3 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            closingTrades.Symbol3 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            closingTrades.Description3 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        if (ordersInfo[x].orderLegCollection.length > 3) {
                                            closingTrades.LegId4 = ordersInfo[x].orderLegCollection[e].legId;
                                            closingTrades.Cusip4 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                            closingTrades.Symbol4 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                            closingTrades.Description4 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                        }
                                        
                                        

                                    }

                                    closingTradesArr.push(closingTrades);

                                }
                            }
                            var valueMatch;
                            var back;
                            var findMatchFunc = function(value) {
                                
                                for (var i = 0; i < closingTradesArr.length; i++) {
                                    if (closingTradesArr[i].Cusip1 === value) {
                                        valueMatch = closingTradesArr[i].Cusip1;
                                        back = {
                                                    Symbol: closingTradesArr[i].Symbol1,
                                                    Price: closingTradesArr[i].Price,
                                                    Cusip1: closingTradesArr[i].Cusip1,
                                                    OpeningOrClosing: closingTradesArr[i].OpeningOrClosing,
                                        };
                                        return valueMatch;
                                    }                          
                                }
                            };

                            for (var d = 0; d < openTradesArr.length; d++) {
                                var matched;
                                if (openTradesArr[d].Cusip1 === findMatchFunc(openTradesArr[d].Cusip1)) {
                                    // matched = {
                                    //     OpeningOrClosing1: openTradesArr[d].OpeningOrClosing,
                                    //     OpeningOrClosing2: valueMatch
                                    // };
                                    console.log(openTradesArr[d].OpeningOrClosing)
                                    console.log(openTradesArr[d].Symbol1)
                                    console.log(openTradesArr[d].Price)
                                    console.log(openTradesArr[d].Cusip1)
                                    console.log("Space")
                                    console.log(back)
                                    console.log("")
                                    console.log("")
                                    console.log("")
                                }
                            }

                        }
                        // console.log(openTradesArr);
                        res.render('testing', { TimeCreate: dateTime, OpenTrades: openTradesArr, ClosingTrades: closingTradesArr, Matched: matched });

                    });

                });

            };    
            
    var getTradesByTrans = function(req, res) {
    
        var categoryType = req.query.category;


            // console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }
    
                var options = {
                    url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-12&endDate=2018-12-07',
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

                        var openTradesArr = [];
                        var closingTradesArr = [];
    
                        // var ordersReply = JSON.parse(body);
                        var transInfo = JSON.parse(body);

                        // console.log(ordersInfo.length)
                        
                        for (var x = 0; x < transInfo.length; x++) {
                            var openTrade;
                            var openTradesCounter = 0;
                            if (transInfo[x].transactionItem.positionEffect === "OPENING") {
                                openTradesCounter++;
                                openTrade = {
                                                NetTotal: transInfo[x].netAmount,
                                                OpenDate: new Date(transInfo[x].transactionDate),
                                                OrderIdSmall: transInfo[x].orderId.substring(0,11),
                                                OrderId: transInfo[x].orderId,
                                                OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                                Cusip: transInfo[x].transactionItem.instrument.cusip,
                                                Symbol: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                                TransId: transInfo[x].transactionId                               
                                };

                                openTradesArr.push(openTrade);
                            }
                        }

                        for (var x = 0; x < transInfo.length; x++) {
                            var closingTrades;
                            if (transInfo[x].transactionItem.positionEffect === "CLOSING") {

                                closingTrades = {
                                                NetTotal: transInfo[x].netAmount,
                                                ClosingDate: transInfo[x].transactionDate,
                                                OrderIdSmall: transInfo[x].orderId.substring(0,11),
                                                OrderId: transInfo[x].orderId,
                                                OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                                Cusip: transInfo[x].transactionItem.instrument.cusip,
                                                Symbol: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                                TransId: transInfo[x].transactionId                               
                                };

                                closingTradesArr.push(closingTrades);

                            }
                        }

                        openTradesArr.sort(function(a, b) { return a.OpenDate-b.OpenDate });

                        // console.log(openTradesArr.sort(function(a, b) { return a.OpenDate-b.OpenDate }))

                        // TimeCreate.create(trade.Date).format('m/d/y')
                        
                        var matchedOpenTradesArr = [];
                        var valueMatch;
                        var usedTransNums = [];
                        var openTradesBuilder;
                        var tradeId = 0;

                        var tradeNumFunc = function(value) {
                            var num1 = matchedOpenTradesArr.length - 1;
                            var num2 = matchedOpenTradesArr.length;
                            if (matchedOpenTradesArr[tradeId - 1] === undefined && matchedOpenTradesArr.length < 1) {
                                return tradeId;
                            }
                            if (matchedOpenTradesArr !== undefined && value === matchedOpenTradesArr[num1].OrderIdSmall) {
                                return matchedOpenTradesArr[num1].TradeId;
                            }
                            if (matchedOpenTradesArr !== undefined && value !== matchedOpenTradesArr[num1].OrderIdSmall) {
                                return matchedOpenTradesArr[num1].TradeId + 1;
                            }
                        };

                        var matchOpenTradesFunc = function(arr, category, value) {
                            if (category === 'OrderIdSmall') {
                                tradeId++;
                                for (var i = 0; i < openTradesArr.length; i++) {
                                    if (openTradesArr[i].OrderIdSmall === value && usedTransNums.indexOf(openTradesArr[i].TransId) === -1) {
                                        openTradesBuilder = {
                                                            Symbol: openTradesArr[i].Symbol,
                                                            Cusip: openTradesArr[i].Cusip,
                                                            OrderIdSmall: openTradesArr[i].OrderIdSmall,
                                                            OrderId: openTradesArr[i].OrderId,
                                                            NetTotal: openTradesArr[i].NetTotal,
                                                            OpeningOrClosing: openTradesArr[i].OpeningOrClosing,
                                                            OpenDate: openTradesArr[i].OpenDate,
                                                            TransId: openTradesArr[i].TransId,
                                                            TradeId: tradeNumFunc(openTradesArr[i].OrderIdSmall)
                                        };

                                        usedTransNums.push(openTradesArr[i].TransId);
                                        matchedOpenTradesArr.push(openTradesBuilder);
                                    }
                                }
                            }
                        };

                        for (var i = 0; i < openTradesArr.length; i++) {
                            matchOpenTradesFunc(openTradesArr, 'OrderIdSmall', openTradesArr[i].OrderIdSmall);
                        }

                        var matchOpenCloseFunc = function(value, openTradeId) {
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if (closingTradesArr[i].Cusip === value && usedTransNums.indexOf(closingTradesArr[i].TransId) === -1) {
                                    closingTradesArr[i].TradeId = openTradeId;
                                    usedTransNums.push(closingTradesArr[i].TransId);
                                }
                            }
                        }

                        for (var i = 0; i < openTradesArr.length; i++) {
                            matchOpenCloseFunc(openTradesArr[i].Cusip, matchedOpenTradesArr[i].TradeId);
                        }

                        var allClosedTradesArr = [];
                        var allClosedTradesBuilder;
                        var usedClosedNums = [];

                        var buildClosedTradesFunc = function(category, value) {
                            if (category === 'Opening') {
                                for (var i = 0; i < closingTradesArr.length; i++) {
                                    if (closingTradesArr[i].TradeId === value && usedClosedNums.indexOf(closingTradesArr[i].TransId) === -1) {
                                        allClosedTradesBuilder = {
                                                                    Symbol: closingTradesArr[i].Symbol,
                                                                    Cusip: closingTradesArr[i].Cusip,
                                                                    OrderId: closingTradesArr[i].OrderId,
                                                                    NetTotal: closingTradesArr[i].NetTotal,
                                                                    OpeningOrClosing: closingTradesArr[i].OpeningOrClosing,
                                                                    Date: closingTradesArr[i].ClosingDate,
                                                                    TransId: closingTradesArr[i].TransId,
                                                                    TradeId: closingTradesArr[i].TradeId
                                        }
                                        usedClosedNums.push(closingTradesArr[i].TransId)
                                        allClosedTradesArr.push(allClosedTradesBuilder);
                                    }
                                }
                            }
                            if (category === 'Closing') {
                                for (var i = 0; i < matchedOpenTradesArr.length; i++) {
                                    if (matchedOpenTradesArr[i].TradeId === value && usedClosedNums.indexOf(matchedOpenTradesArr[i].TransId) === -1) {
                                        allClosedTradesBuilder = {
                                                                    Symbol: matchedOpenTradesArr[i].Symbol,
                                                                    Cusip: matchedOpenTradesArr[i].Cusip,
                                                                    OrderId: matchedOpenTradesArr[i].OrderId,
                                                                    NetTotal: matchedOpenTradesArr[i].NetTotal,
                                                                    OpeningOrClosing: matchedOpenTradesArr[i].OpeningOrClosing,
                                                                    Date: matchedOpenTradesArr[i].OpenDate,
                                                                    TransId: matchedOpenTradesArr[i].TransId,
                                                                    TradeId: matchedOpenTradesArr[i].TradeId
                                        }
                                        usedClosedNums.push(matchedOpenTradesArr[i].TransId)
                                        allClosedTradesArr.push(allClosedTradesBuilder);

                                    }
                                }
                            }
                        }

                        for (var i = 0; i < openTradesArr.length; i++) {
                            buildClosedTradesFunc('Opening' ,matchedOpenTradesArr[i].TradeId);
                        }
                        for (var i = 0; i < closingTradesArr.length; i++) {
                            buildClosedTradesFunc('Closing' ,closingTradesArr[i].TradeId);
                        }

                        var totalsArr = [];
                        var usedTradeIdNums = [];
                        var totalsBuilderFunc = function(value) {
                            var priceTotals = 0;
                            for (var i = 0; i < allClosedTradesArr.length; i++) {
                                if (allClosedTradesArr[i].TradeId === value) {
                                    priceTotals += allClosedTradesArr[i].NetTotal;
                                }    
                            }
                            return priceTotals;
                        }

                        for (var i = 0; i < allClosedTradesArr.length; i++) {
                            if (usedTradeIdNums.indexOf(allClosedTradesArr[i].TradeId) === -1) {
                                totalsInfo = {
                                    Symbol: allClosedTradesArr[i].Symbol,
                                    Amount: totalsBuilderFunc(allClosedTradesArr[i].TradeId),
                                    TradeId: allClosedTradesArr[i].TradeId
                                };
                                usedTradeIdNums.push(allClosedTradesArr[i].TradeId)
                                totalsArr.push(totalsInfo);
                            };
                        }

                        var createDates;
                        var createDatesArr = [];

                        for (var i = 0; i < transInfo.length; i++) {
                            createDates = {
                                            TransId: transInfo[i].transactionId,
                                            OrderIdShort: transInfo[i].orderId.substring(0,11),
                                            Date: new Date(transInfo[i].transactionDate),
                                            Cusip: transInfo[i].transactionItem.instrument.cusip,
                                            OpeningOrClosing: transInfo[i].transactionItem.positionEffect
                            }
                            createDatesArr.push(createDates);
                        }

                        createDatesArr.sort(function(a, b) { return a.Date-b.Date });

                        var buildTradeId;
                        var builtTradesByTradeIdArr = [];
                        var usedBuiltTradesTradeIdArr = [];

                        var buildTradeIdFunc = function(orderId, cusip, counter) {
                            for (var i = 0; i < createDatesArr.length; i++) {
                                if (createDatesArr[i].OrderIdShort === orderId || createDatesArr[i].Cusip === cusip && usedBuiltTradesTradeIdArr.indexOf(createDatesArr[i].TransId)) {
                                    createDatesArr[i].TradeId = counter;                                    
                                    usedBuiltTradesTradeIdArr.push(createDatesArr[i].TransId)
                                }
                            }
                        }

                        var tradeIdCounter = 1;
                        for (var i = 0; i < createDatesArr.length; i++) {
                            if (createDatesArr[i].TradeId === undefined) {
                                buildTradeIdFunc(createDatesArr[i].OrderIdShort, createDatesArr[i].Cusip, tradeIdCounter);
                                tradeIdCounter++;   
                            }
                        }

                        var search;
                        var searchFunc = function(value) {
                            for (var i = 0; i < transInfo.length; i++) {
                                if (transInfo[i].transactionId === value) {
                                    search = transInfo[i].netAmount; 
                                    return search;
                                }
                            }
                        }

                        
                        var getTotalsFunc = function(value) {
                            var getTotals = 0;
                            for (var i = 0; i < createDatesArr.length; i++) {
                                if (createDatesArr[i].TradeId === value && createDatesArr[i].Price === undefined) {
                                    getTotals += Math.round(searchFunc(createDatesArr[i].TransId));
                                }
                            }
                                return getTotals;
                        }

                        for (var i = 0; i < createDatesArr.length; i++) {
                            createDatesArr[i].Price = getTotalsFunc(createDatesArr[i].TradeId);
                        }

                        var builtOpenTradesArr = [];
                        var usedOpenTradeNums = [];
                        var newOpenTrades;
                        var buildingOpenTrades = function(value, tradeCounter) {
                            for (var i = 0; i < transInfo.length; i++) {
                                if (transInfo[i].orderId.substring(0,11) === value) {
                                    newOpenTrades = {
                                                    TransId: transInfo[i].transactionId,
                                                    OrderIdShort: transInfo[i].orderId.substring(0,11),
                                                    Date: new Date(transInfo[i].transactionDate),
                                                    Cusip: transInfo[i].transactionItem.instrument.cusip,
                                                    OpeningOrClosing: transInfo[i].transactionItem.positionEffect,
                                                    TradeId: tradeCounter
                                    }
                                    usedOpenTradeNums.push(transInfo[i].transactionId);
                                    builtOpenTradesArr.push(newOpenTrades);
                                }
                            }    
                        }

                        var tradeCounter2 = 1
                        for (var i = 0; i < transInfo.length; i++) {
                            if(transInfo[i].transactionItem.positionEffect === "OPENING" && usedOpenTradeNums.indexOf(transInfo[i].transactionId) === -1) {
                                buildingOpenTrades(transInfo[i].orderId.substring(0,11), tradeCounter2)
                                tradeCounter2++;
                            }
                        }

                        console.log(builtOpenTradesArr)
                        // console.log(createDatesArr);
                        // console.log(totalsArr);
                        // console.log(closingTradesArr);
                        // console.log(allClosedTradesArr);
                    
                    } // Request if End

                    // console.log(openTradesArr);
                    res.render('transtemp', { TimeCreate: dateTime, OpenTrades: openTradesArr, ClosingTrades: closingTradesArr, BuiltTrades: matchedOpenTradesArr, AllClosedTrades: allClosedTradesArr, CreateDates: createDatesArr });

                }); //Request End

            });

    };
            

    router.route('/testing').get(getTradesByCloseDate);
    router.route('/transtemp').get(getTradesByTrans);
    return router;

};