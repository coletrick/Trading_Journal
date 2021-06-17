const dateTime = require('node-datetime');
var dateFormat = require('dateformat');
const pool = require('../db.connection.js');
const request = require('request');
const refresh = require('./getAuth.routes.js');
var rp = require('request-promise');

var works;

module.exports = function(router) {

    
    var getTradesByTrans = function(req, res) {
    
        var categoryType = req.query.category;

        pool.query('SELECT * FROM Tokens', function(err, rows, fields) {

            // console.log('hey getting your attention ' + rows[0].RefreshTimeStamp);

            var dbRefreshTimeStamp = rows[0].RefreshTimeStamp.setMinutes(rows[0].RefreshTimeStamp.getMinutes() + 29);
            var refreshTimeStamp = new Date(dbRefreshTimeStamp);

            if (refreshTimeStamp < new Date) {
                refresh.getTokenRefresh();
                console.log('Got new Refresh Token')
                console.log('Database Timestamp + 29 mins' + refreshTimeStamp)
                console.log('Current Timestamp ' + new Date)
            }

            if (refreshTimeStamp > new Date) {
                console.log('Refresh token not needed')
                console.log('Database Timestamp + 29 mins' + refreshTimeStamp)
                console.log('Current Timestamp ' + new Date)
            }

        });


            // console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }
    
                var options = {
                        // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-19&endDate=2018-12-12', // IRA
                        url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
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

                        var transInfo = JSON.parse(body);

//======================================================= Separating Opening/Closing Trades ==================================================================

                        
                        var openingTradesArr = [];
                        var closingTradesArr = [];

                        for (var x = 0; x < transInfo.length; x++) {
                            var openingTrade;
                            if (transInfo[x].transactionItem.positionEffect === "OPENING") {
                                openingTrade = {
                                                NetAmount: transInfo[x].netAmount,
                                                OpeningDate: new Date(transInfo[x].transactionDate),
                                                OrderIdShort: transInfo[x].orderId.substring(0,11),
                                                OrderId: transInfo[x].orderId,
                                                OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                                Cusip: transInfo[x].transactionItem.instrument.cusip,
                                                Symbol: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                                TransId: transInfo[x].transactionId                               
                                };

                                openingTradesArr.push(openingTrade);
                            }
                        }

                        for (var x = 0; x < transInfo.length; x++) {
                            var closingTrade;
                            if (transInfo[x].transactionItem.positionEffect === "CLOSING") {
                                closingTrade = {
                                                NetAmount: transInfo[x].netAmount,
                                                ClosingDate: new Date(transInfo[x].transactionDate),
                                                OrderIdShort: transInfo[x].orderId.substring(0,11),
                                                OrderId: transInfo[x].orderId,
                                                OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                                Cusip: transInfo[x].transactionItem.instrument.cusip,
                                                Symbol: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                                TransId: transInfo[x].transactionId                               
                                };

                                closingTradesArr.push(closingTrade);

                            }
                        }

                        openingTradesArr.sort(function(a, b) { return a.OpeningDate-b.OpeningDate }); // Reversing array so oldest trades get first trade ID


//======================================================= Assigning Trade ID's to Opening Trades ================================================


                        var usedOpeningTradeNums = [];
                        var openingTradesFunc = function(value, counter) {
                            for (var i = 0; i < openingTradesArr.length; i++) {
                                if (openingTradesArr[i].OrderIdShort === value) {
                                    openingTradesArr[i].TradeId = counter;
                                    usedOpeningTradeNums.push(openingTradesArr[i].TransId);
                                }
                            }    
                        }

                        var tradeCounter = 1
                        for (var i = 0; i < openingTradesArr.length; i++) {
                            if(usedOpeningTradeNums.indexOf(openingTradesArr[i].TransId) === -1) {
                                openingTradesFunc(openingTradesArr[i].OrderIdShort, tradeCounter)
                                tradeCounter++;
                            }
                        }

//======================================================= Assigning Trade ID's to Closing Trades ================================================

                        var closingTradesFunc = function(value, tradeId, arrNum) {
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if (closingTradesArr[i].Cusip === value && closingTradesArr[i].TradeId === undefined) {
                                    closingTradesArr[i].TradeId = tradeId;
                                    closingTradesArr[i].Closed = 'Yes';
                                    openingTradesArr[arrNum].Closed = 'Yes';
                                }
                            }
                        }

                        for (var i = 0; i < openingTradesArr.length; i++) {
                            closingTradesFunc(openingTradesArr[i].Cusip, openingTradesArr[i].TradeId, i)
                        }

//======================================================= Building Closed Trade Totals ============================================================

                        
                        var buildingClosedTradesFunc = function(value) {
                            var closedTradesTotal = 0;
                            for (var i = 0; i < openingTradesArr.length; i++) {
                                if(openingTradesArr[i].TradeId === value && openingTradesArr[i].Closed === 'Yes') {
                                    closedTradesTotal += openingTradesArr[i].NetAmount;
                                }
                            }
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if(closingTradesArr[i].TradeId === value && closingTradesArr[i].Closed == 'Yes') {
                                    closedTradesTotal += closingTradesArr[i].NetAmount;
                                }
                            }
                                    return closedTradesTotal;                                   
                        }
                        
                        var allClosedTradesArr = [];
                        var allClosedTrades;
                        var allClosedOrderIdsUsedNums = [];
                        for (var i = 0; i < openingTradesArr.length; i++) {
                            if (allClosedOrderIdsUsedNums.indexOf(openingTradesArr[i].OrderIdShort) === -1 && openingTradesArr[i].Closed === 'Yes') {
                                allClosedTrades = {
                                                        TradeId: openingTradesArr[i].TradeId,
                                                        Symbol: openingTradesArr[i].Symbol,
                                                        OpeningDate: openingTradesArr[i].OpeningDate,
                                                        OrderId: openingTradesArr[i].OrderId,
                                                        NetTotal: buildingClosedTradesFunc(openingTradesArr[i].TradeId)
                                }
                                
                                allClosedTradesArr.push(allClosedTrades);
                                allClosedOrderIdsUsedNums.push(openingTradesArr[i].OrderIdShort);
                            }
                        }

                        var closedTradesTotals = 0;
                        var closedTradesTotalsArr = [];
                        for (var i = 0; i < allClosedTradesArr.length; i++) {
                            closedTradesTotals += allClosedTradesArr[i].NetTotal;
                        }

                        closedTradesTotalsArr.push(closedTradesTotals);

//======================================================= Building Open Trade Totals =======================================================================

                        
                        var openingTradesTotalsFunc = function(value) {
                            var openTradestotal = 0;
                            for (var i = 0; i < openingTradesArr.length; i++) {
                                if (openingTradesArr[i].TradeId === value) {
                                    openTradestotal += openingTradesArr[i].NetAmount;
                                }
                            }
                                return openTradestotal;
                        } 

                        var allOpenTradesArr = [];
                        var allOpenTrades;
                        var allOpenOrderIdsUsedNums = [];
                        for (var i = 0; i < openingTradesArr.length; i++) {
                            if (!openingTradesArr[i].Closed && allOpenOrderIdsUsedNums.indexOf(openingTradesArr[i].OrderIdShort) === -1) {
                                allOpenTrades = {
                                                    TradeId: openingTradesArr[i].TradeId,
                                                    Symbol: openingTradesArr[i].Symbol,
                                                    OpeningDate: openingTradesArr[i].OpeningDate,
                                                    OrderId: openingTradesArr[i].OrderId,
                                                    NetTotal: openingTradesTotalsFunc(openingTradesArr[i].TradeId)
                                }
                                
                                allOpenTradesArr.push(allOpenTrades);
                                allOpenOrderIdsUsedNums.push(openingTradesArr[i].OrderIdShort);
                            }
                        }

                        var openTradesTotals = 0;
                        var openTradesTotalsArr = [];
                        for (var i = 0; i < allOpenTradesArr.length; i++) {
                            if (allOpenTradesArr[i].NetTotal < 0) {
                                openTradesTotals += Math.abs(allOpenTradesArr[i].NetTotal);
                            }
                            if (allOpenTradesArr[i].NetTotal > 0) {
                                openTradesTotals += allOpenTradesArr[i].NetTotal;
                            }
                        }

                        openTradesTotalsArr.push(openTradesTotals);


//======================================================= Building Totals ================================================================================






                        // console.log(openingTradesArr)
                        // console.log(closingTradesArr)
                        // console.log(allClosedTradesArr)
                        // console.log(allOpenTradesArr)
                        // console.log(openTradesTotalsArr)
                    
                    } // Request if End

                    // console.log(openTradesArr);
                    // res.render('trans', { TimeCreate: dateTime, OpenTrades: openingTradesArr, ClosingTrades: closingTradesArr });
                    res.render('trans', { TimeCreate: dateTime, OpenTrades: openingTradesArr, AllClosedTrades: allClosedTradesArr, AllOpenTrades: allOpenTradesArr, OpenTradesTotals: openTradesTotalsArr, ClosedTradesTotals: closedTradesTotalsArr });

                }); //Request End

            });

    };




//======================================================= ORDERS =========================================================================================================================================================================================

    var getTradesByOrder = function(req, res) {
    
        var categoryType = req.query.category;


            // console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }
    
                var options = {
                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // IRA
                    // url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/orders?fromEnteredTime=2018-11-19&toEnteredTime=2019-01-05&status=FILLED&status=FILLED', // TTi
                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-11-19&toEnteredTime=2018-12-30&status=FILLED', // IRA
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

                        var ordersInfo = JSON.parse(body);

//======================================================= Separating Opening/Closing Trades ==================================================================

                        
                        var calcPriceFunc = function(orderType, price, quantity, opening ,closing) {
                            if (orderType === 'NET_DEBIT') {
                                return -Math.abs(price * quantity * 100);
                            }
                            if (orderType === "NET_CREDIT") {
                                return price * quantity * 100;
                            }
                            if ((orderType !== "NET_DEBIT" || orderType !== "NET_CREDIT") && opening === true) {
                                return -Math.abs(price * quantity * 100);
                            }
                            if ((orderType !== "NET_DEBIT" || orderType !== "NET_CREDIT") && closing === true) {
                                // return -Math.abs(price * quantity * 100);
                                return price * quantity * 100;
                            }
                        }

                        var putOrCallFunc = function(value) {
                            var symbol = value.split("_")[1];
                            if (symbol.indexOf('P') > -1) {
                                return 'Put'
                            }
                            if (symbol.indexOf('C') > -1) {
                                return 'Call'
                            }
                        }

                        var findStrikeFunc = function(value) {
                            var symbol = value.split("_")[1];
                            if (symbol.indexOf('P') > -1) {
                                var index = symbol.indexOf('P');
                                return symbol.substring(index+1);
                            }
                            if (symbol.indexOf('C') > -1) {
                                var index = symbol.indexOf('C');
                                return symbol.substring(index+1);
                            }
                        }

                        var findExpDateFunc = function(value) {
                            var num = value.indexOf(" ");
                            // console.log(value.substring(num+1, 16))
                            return value.substring(num+1, 16)
                        }

                        var openingTradesArr = [];
                        var closingTradesArr = [];

                        for (var x = 0; x < ordersInfo.length; x++) {
                            var openingTrade;
                            if (ordersInfo[x].orderLegCollection[0].positionEffect === "OPENING") {
                                openingTrade = {
                                                    OpeningDate: new Date(ordersInfo[x].closeTime),
                                                    OrderId: ordersInfo[x].orderId,
                                                    OpeningOrClosing: ordersInfo[x].orderLegCollection[0].positionEffect,
                                                    Symbol: ordersInfo[x].orderLegCollection[0].instrument.symbol,
                                                    PutOrCall: putOrCallFunc(ordersInfo[x].orderLegCollection[0].instrument.symbol),
                                                    Strike: parseInt(findStrikeFunc(ordersInfo[x].orderLegCollection[0].instrument.symbol)),
                                                    ExpDate: new Date(findExpDateFunc(ordersInfo[x].orderLegCollection[0].instrument.description)),
                                                    Price: ordersInfo[x].price,
                                                    OpeningQuantity: ordersInfo[x].quantity,
                                                    OpeningFilledQuantity: ordersInfo[x].filledQuantity,
                                                    ComplexOrderType: ordersInfo[x].complexOrderStrategyType,
                                                    OrderType: ordersInfo[x].orderType,
                                                    NetTotal: calcPriceFunc(ordersInfo[x].orderType, ordersInfo[x].price, ordersInfo[x].quantity, true),
                                };

                                for (var e = 0; e < ordersInfo[x].orderLegCollection.length; e++) {
                                    openingTrade.LegId1 = ordersInfo[x].orderLegCollection[e].legId;
                                    openingTrade.Cusip1 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                    openingTrade.Symbol1 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                    openingTrade.Description1 = ordersInfo[x].orderLegCollection[e].instrument.description;

                                    if (ordersInfo[x].orderLegCollection.length > 1) {
                                        openingTrade.LegId2 = ordersInfo[x].orderLegCollection[e].legId;
                                        openingTrade.cusip2 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                        openingTrade.Symbol2 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                        openingTrade.Description2 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                    }
                                    if (ordersInfo[x].orderLegCollection.length > 2) {
                                        openingTrade.LegId3 = ordersInfo[x].orderLegCollection[e].legId;
                                        openingTrade.Cusip3 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                        openingTrade.Symbol3 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                        openingTrade.Description3 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                    }
                                    if (ordersInfo[x].orderLegCollection.length > 3) {
                                        openingTrade.LegId4 = ordersInfo[x].orderLegCollection[e].legId;
                                        openingTrade.Cusip4 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                        openingTrade.Symbol4 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                        openingTrade.Description4 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                    }
                                }

                                openingTradesArr.push(openingTrade);

                            }
                    }



                    for (var x = 0; x < ordersInfo.length; x++) {
                        var closingTrade;
                        if (ordersInfo[x].orderLegCollection[0].positionEffect === "CLOSING") {
                            closingTrade = {
                                                ClosingDate: new Date(ordersInfo[x].closeTime),
                                                OrderId: ordersInfo[x].orderId,
                                                ClosingOrClosing: ordersInfo[x].orderLegCollection[0].positionEffect,
                                                Symbol: ordersInfo[x].orderLegCollection[0].instrument.symbol,
                                                PutOrCall: putOrCallFunc(ordersInfo[x].orderLegCollection[0].instrument.symbol),
                                                Strike: parseInt(findStrikeFunc(ordersInfo[x].orderLegCollection[0].instrument.symbol)),
                                                ExpDate: new Date(findExpDateFunc(ordersInfo[x].orderLegCollection[0].instrument.description)),
                                                Price: ordersInfo[x].price,
                                                ClosingQuantity: ordersInfo[x].quantity,
                                                ClosingFilledQuantity: ordersInfo[x].filledQuantity,
                                                ComplexOrderType: ordersInfo[x].complexOrderStrategyType,
                                                OrderType: ordersInfo[x].orderType,
                                                NetTotal: calcPriceFunc(ordersInfo[x].orderType, ordersInfo[x].price, ordersInfo[x].quantity, false, true),        
                            };

                            for (var e = 0; e < ordersInfo[x].orderLegCollection.length; e++) {
                                closingTrade.LegId1 = ordersInfo[x].orderLegCollection[e].legId;
                                closingTrade.Cusip1 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                closingTrade.Symbol1 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                closingTrade.Description1 = ordersInfo[x].orderLegCollection[e].instrument.description;

                                if (ordersInfo[x].orderLegCollection.length > 1) {
                                    closingTrade.LegId2 = ordersInfo[x].orderLegCollection[e].legId;
                                    closingTrade.cusip2 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                    closingTrade.Symbol2 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                    closingTrade.Description2 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                }
                                if (ordersInfo[x].orderLegCollection.length > 2) {
                                    closingTrade.LegId3 = ordersInfo[x].orderLegCollection[e].legId;
                                    closingTrade.Cusip3 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                    closingTrade.Symbol3 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                    closingTrade.Description3 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                }
                                if (ordersInfo[x].orderLegCollection.length > 3) {
                                    closingTrade.LegId4 = ordersInfo[x].orderLegCollection[e].legId;
                                    closingTrade.Cusip4 = ordersInfo[x].orderLegCollection[e].instrument.cusip;
                                    closingTrade.Symbol4 = ordersInfo[x].orderLegCollection[e].instrument.symbol;
                                    closingTrade.Description4 = ordersInfo[x].orderLegCollection[e].instrument.description;
                                }
                            }

                            closingTradesArr.push(closingTrade);

                        }
                }



                        // for (var x = 0; x < orderInfo.length; x++) {
                        //     var openingTrade;
                        //     if (orderInfo[x].orderLegCollection[0].positionEffect === "OPENING") {
                        //         openingTrade = {
                        //                         OpeningDate: new Date(ordersInfo[x].closeTime),
                        //                         OrderId: orderInfo[x].orderId,
                        //                         OpeningOrClosing: orderInfo[x].orderLegCollection[0].positionEffect,
                        //                         Symbol: orderInfo[x].orderLegCollection[0].instrument.symbol,
                        //                         Price: ordersInfo[x].price,
                        //                         OpenQuantity: ordersInfo[x].filledQuantity,
                        //                         ComplexOrderType: ordersInfo[x].complexOrderStrategyType                   
                        //         };

                        //         openingTradesArr.push(openingTrade);
                        //     }
                        // }

                        // for (var x = 0; x < orderInfo.length; x++) {
                        //     var closingTrade;
                        //     if (orderInfo[x].transactionItem.positionEffect === "CLOSING") {
                        //         closingTrade = {
                        //                         NetAmount: orderInfo[x].netAmount,
                        //                         ClosingDate: new Date(orderInfo[x].transactionDate),
                        //                         OrderIdShort: orderInfo[x].orderId.substring(0,11),
                        //                         OrderId: orderInfo[x].orderId,
                        //                         OpeningOrClosing: orderInfo[x].transactionItem.positionEffect,
                        //                         Cusip: orderInfo[x].transactionItem.instrument.cusip,
                        //                         Symbol: orderInfo[x].transactionItem.instrument.underlyingSymbol,
                        //                         TransId: orderInfo[x].transactionId                               
                        //         };

                        //         closingTradesArr.push(closingTrade);

                        //     }
                        // }

                        openingTradesArr.sort(function(a, b) { return a.OpeningDate-b.OpeningDate }); // Reversing array so oldest trades get first trade ID


//======================================================= Assigning Trade ID's to Opening Trades ================================================

                        var matchDayTradesFunc = function(strike, expDate, symbol, counter) {
                            
                            for (var i = 0; i < openingTradesArr.length; i++) {
                                var num = 0;
                                var experDate1 = expDate.getTime();
                                var experDate2 = openingTradesArr[i].ExpDate.getTime();
                                var sym1 = symbol.split("_")[0];
                                var sym2 = openingTradesArr[i].Symbol.split("_")[0];
                                num = openingTradesArr[i].Strike - strike;
                                absNum = Math.abs(num);
                                if (absNum < 10 && sym1 === sym2 && experDate1 == experDate2) {
                                    console.log(openingTradesArr[i].TradeId)
                                    openingTradesArr[i].TradeId = counter;
                                    // console.log(experDate1)
                                    // console.log(experDate2)
                                    // console.log(openingTradesArr[i].TradeId)
                                    
                                }
                                // if (absNum < 10 && expDate === openingTradesArr[i].ExpDate && sym1 === sym2 && openingTradesArr[i].TradeId === undefined) {
                                //     openingTradesArr[i].TradeId = counter;
                                //     // console.log('worked')
                                // }

                            }
                        }

                        var orderTradeCounter = 1
                        for (var i = 0; i < openingTradesArr.length; i++) {
                            matchDayTradesFunc(openingTradesArr[i].Strike, openingTradesArr[i].ExpDate, openingTradesArr[i].Symbol, orderTradeCounter)
                            openingTradesArr[i].TradeId = orderTradeCounter;
                            orderTradeCounter++;
                        }

//======================================================= Assigning Trade ID's to Closing Trades ================================================

                        
                        var lostClosedTradesArr = [];
                        var closingTradesFunc = function(tradeId, cusip, quantity, arrNum) {
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if (closingTradesArr[i].Cusip1 === cusip && closingTradesArr[i].ClosingFilledQuantity === quantity) {
                                    closingTradesArr[i].TradeId = tradeId;
                                    closingTradesArr[i].Closed = 'Yes';
                                    openingTradesArr[arrNum].Closed = 'Yes';
                                }
                                if (closingTradesArr[i].Cusip1 === cusip && closingTradesArr[i].ClosingFilledQuantity !== quantity) {
                                    lostClosedTradesArr.push(closingTradesArr[i].OrderId);
                                }
                            }
                        }

                        for (var i = 0; i < openingTradesArr.length; i++) {
                            closingTradesFunc(openingTradesArr[i].TradeId ,openingTradesArr[i].Cusip1, openingTradesArr[i].OpeningFilledQuantity, i)
                        }


//======================================================= Separating Day & Swing Trades ============================================================


                        // var dayTradesArr = []
                        // for (var i = 0; i < openingTradesArr.length; i++) {
                        //     var date = new Date(openingTradesArr[i].OpeningDate)
                        //     var currentDate = new Date();
                        //     if (currentDate <= date.setDate(date.getDate() + 7)) {

                        //     }
                        // }



//======================================================= Building Closed Trade Totals ============================================================

                        
                        var buildingClosedTradesFunc = function(value) {
                            var closedTradesTotal = 0;
                            var openingTradesTotal = 0;
                            var closingTradesTotal = 0;
                            for (var i = 0; i < openingTradesArr.length; i++) {
                                if (openingTradesArr[i].TradeId === value && openingTradesArr[i].Closed === 'Yes') {
                                    openingTradesTotal = openingTradesArr[i].NetTotal;
                                }
                            }
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if(closingTradesArr[i].TradeId === value && closingTradesArr[i].Closed == 'Yes') {
                                    closingTradesTotal = closingTradesArr[i].NetTotal;
                                }
                            }
                                closedTradesTotal =  openingTradesTotal + closingTradesTotal;
                                    return closedTradesTotal;                                   
                        }

                        var getClosingDate = function(value) {
                            for (var i = 0; i < closingTradesArr.length; i++) {
                                if(closingTradesArr[i].TradeId === value && closingTradesArr[i].Closed == 'Yes') {
                                    return closingTradesArr[i].ClosingDate;
                                }
                            }
                        }
                        
                        var allClosedTradesArr = [];
                        var allClosedTrades;
                        for (var i = 0; i < openingTradesArr.length; i++) {
                            if (openingTradesArr[i].Closed === 'Yes') {
                                allClosedTrades = {
                                                        TradeId: openingTradesArr[i].TradeId,
                                                        Symbol: openingTradesArr[i].Symbol,
                                                        OpeningDate: openingTradesArr[i].OpeningDate,
                                                        ClosingDate: getClosingDate(openingTradesArr[i].TradeId),
                                                        OrderId: openingTradesArr[i].OrderId,
                                                        OrderType: openingTradesArr[i].OrderType,
                                                        ComplexOrderType: openingTradesArr[i].ComplexOrderType,
                                                        NetTotal: buildingClosedTradesFunc(openingTradesArr[i].TradeId)
                                }
                                
                                allClosedTradesArr.push(allClosedTrades);
                            }
                        }

                        var closedTradesTotals = 0;
                        var closedTradesTotalsArr = [];
                        for (var i = 0; i < allClosedTradesArr.length; i++) {
                            closedTradesTotals += allClosedTradesArr[i].NetTotal;
                        }

                        closedTradesTotalsArr.push(closedTradesTotals);



//======================================================= Building Day Trades =============================================================================









//======================================================= Building Open Trade Totals =======================================================================

                        
                        // var openingTradesTotalsFunc = function(value) {
                        //     var openTradestotal = 0;
                        //     for (var i = 0; i < openingTradesArr.length; i++) {
                        //         if (openingTradesArr[i].TradeId === value) {
                        //             openTradestotal += openingTradesArr[i].NetAmount;
                        //         }
                        //     }
                        //         return openTradestotal;
                        // } 

                        // var allOpenTradesArr = [];
                        // var allOpenTrades;
                        // var allOpenOrderIdsUsedNums = [];
                        // for (var i = 0; i < openingTradesArr.length; i++) {
                        //     if (!openingTradesArr[i].Closed && allOpenOrderIdsUsedNums.indexOf(openingTradesArr[i].OrderIdShort) === -1) {
                        //         allOpenTrades = {
                        //                             TradeId: openingTradesArr[i].TradeId,
                        //                             Symbol: openingTradesArr[i].Symbol,
                        //                             OpeningDate: openingTradesArr[i].OpeningDate,
                        //                             OrderId: openingTradesArr[i].OrderId,
                        //                             NetTotal: openingTradesTotalsFunc(openingTradesArr[i].TradeId)
                        //         }
                                
                        //         allOpenTradesArr.push(allOpenTrades);
                        //         allOpenOrderIdsUsedNums.push(openingTradesArr[i].OrderIdShort);
                        //     }
                        // }

                        // var openTradesTotals = 0;
                        // var openTradesTotalsArr = [];
                        // for (var i = 0; i < allOpenTradesArr.length; i++) {
                        //     if (allOpenTradesArr[i].NetTotal < 0) {
                        //         openTradesTotals += Math.abs(allOpenTradesArr[i].NetTotal);
                        //     }
                        //     if (allOpenTradesArr[i].NetTotal > 0) {
                        //         openTradesTotals += allOpenTradesArr[i].NetTotal;
                        //     }
                        // }

                        // openTradesTotalsArr.push(openTradesTotals);


//======================================================= Building Totals ================================================================================



                        var test = openingTradesArr[0].OpeningDate

                        var test2 = new Date(test);



                        // console.log(new Date(test2.setDate(test2.getDate() + 7)))
                        // console.log(openingTradesArr[0].OpeningDate)

                        // console.log(closedTradesTotalsArr)
                        // console.log(openingTradesArr)
                        // console.log(closingTradesArr)
                        // console.log(lostClosedTradesArr)
                        // console.log(allClosedTradesArr)
                        // console.log(allOpenTradesArr)
                        // console.log(openTradesTotalsArr)
                    
                    } // Request if End

                    // console.log(openTradesArr);
                    // res.render('trans', { TimeCreate: dateTime, OpenTrades: openingTradesArr, ClosingTrades: closingTradesArr });
                    res.render('orders', { TimeCreate: dateTime, OpenTrades: openingTradesArr, AllClosedTrades: allClosedTradesArr, ClosedTradesTotals: closedTradesTotals});

                }); //Request End

            });

    };



    //======================================================= Assinging Trades =========================================================================================================================================================================================

    var getAssignTrades = function(req, res) {
    
        var categoryType = req.query.category;


            // console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }
    
                var options = {
                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // IRA
                    // url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/orders?fromEnteredTime=2018-11-19&toEnteredTime=2019-01-05&status=FILLED&status=FILLED', // TTi
                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-11-19&toEnteredTime=2018-12-30&status=FILLED', // IRA
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

                        var ordersInfo = JSON.parse(body);

                        ordersInfo.reverse();

                        // for (var x = 0; x < ordersInfo.length; x++) {
                            
                        //     pool.query('INSERT INTO Orders SET ?', {OrderDate: ordersInfo[x].closeTime, OrderDescription: ordersInfo[x].orderLegCollection[0].instrument.description}, function (error, rows, fields) {
                        //         console.log('Database Updated')

                        //         if (error) {
                        //             console.log(error)
                        //         }

                        //     });
                        // }

                        pool.query('SELECT * FROM Orders', function(err, rows, fields) {


                        console.log(rows)



                           
                        
                    res.render('assignTrades', {Trades: rows });

                    });

                } // Request if End 

                }); //Request End

            }); //Tokens Pool End

    };



    //======================================================= Trade Input Page =========================================================================================================================================================================================

    var getTradeInput = function(req, res) {
    
        var categoryType = req.query.category;

        var dbRows = 0;
        var dbTradesArr = [];
        var dbTrades;


        // console.log(dbTradesArr)
            // console.log('getOrdersUpdate');
            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }
    
                // var options = [   
                //                 {
                //                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // IRA
                //                     // url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
                //                     url: 'https://api.tdameritrade.com/v1/accounts/494120489/orders?fromEnteredTime=2018-11-19&toEnteredTime=2019-01-10&status=FILLED', // TTi
                //                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-11-19&toEnteredTime=2018-12-30&status=FILLED', // IRA
                //                     method: 'GET',
                //                     headers: headers,
                //                             //POST Body params
                //                         // query: {
                //                         //     'maxResults': null,
                //                         //     'fromEnteredTime': '2018-02-01',
                //                         //     'toEnteredTime': '2018-03-24',
                //                         //     'status': 'FILLED'
                //                         // }
                //                 },
                //                 {
                //                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-19&endDate=2018-12-12', // IRA
                //                     url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=ALL&startDate=2018-11-19&endDate=2019-01-10', // TTi
                //                     method: 'GET',
                //                     headers: headers,
                //                             //POST Body params
                //                         // query: {
                //                         //     'maxResults': null,
                //                         //     'fromEnteredTime': '2018-02-01',
                //                         //     'toEnteredTime': '2018-03-24',
                //                         //     'status': 'FILLED'
                //                         // }

                //                 }
                // ];

                var transUrl = {
                                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-19&endDate=2018-12-12', // IRA
                                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=ALL&startDate=2018-11-19&endDate=2019-02-11', // TTi
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
                var ordersUrl = {
                                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // IRA
                                    // url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
                                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/orders?fromEnteredTime=2018-11-19&toEnteredTime=2019-02-11&status=FILLED', // TTi
                                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-11-19&toEnteredTime=2018-12-30&status=FILLED', // IRA
                                    method: 'GET',
                                    headers: headers,
                                            //POST Body params
                                        // query: {
                                        //     'maxResults': null,
                                        //     'fromEnteredTime': '2018-02-01',
                                        //     'toEnteredTime': '2018-03-24',
                                        //     'status': 'FILLED'
                                        // }
                                        // json: true
                }

                // pool.query('SELECT * FROM Orders', function(err, rows, fields) {

                //     dbRows = rows.length;
        
                //     for (var x = 0; x < rows.length; x++) {
                //         dbTrades = {
                //                         TradeId: rows[x].TradeId,
                //                         OrderId: rows[x].OrderId,
                //         }
        
                //         dbTradesArr.push(dbTrades);
                //     }

                    // console.log(options)

                // async function fun1(req, res){
                //     let response = await request.get(ordersUrl);
                //         if (response.err) { console.log('error');}
                //         else { console.log('fetched response');}
                //         // works = response;
                //         // console.log(response)
                //         // console.log(works)

                //         return res

                // }

                // foo = fun1();

                // console.log('this is foo' + foo)

                

                
            //     async function stuff() {

            //         things = await request(ordersUrl, function (err, res, body){


            //         return await body;

            //         })
                    



            //     }

            //     // stuff();
            // //    console.log(stuff());
            // stuff().then(console.log)



            // var options = {
            //     uri: 'https://api.github.com/user/repos',
            //     qs: {
            //         access_token: 'xxxxx xxxxx' // -> uri + '?access_token=xxxxx%20xxxxx'
            //     },
            //     headers: {
            //         'User-Agent': 'Request-Promise'
            //     },
            //     json: true // Automatically parses the JSON string in the response
            // };

                var ordersInfo;
                var order;
                var ordersArr = [];

                rp(ordersUrl)
                .then(function (orders) {                   
                    ordersInfo = JSON.parse(orders);
                    ordersInfo.reverse();

                    for (var x = 0; x < ordersInfo.length; x++) {
                            order = {
                                        OrderDate: ordersInfo[x].closeTime,
                                        OrderId: ordersInfo[x].orderId,
                                        OrderType: ordersInfo[x].orderType,
                                        ComplexOrderType: ordersInfo[x].complexOrderStrategyType,
                                        OrderQuantity: ordersInfo[x].quantity,
                                        OrderPrice: ordersInfo[x].price,
                                        OrderDescription: ordersInfo[x].orderLegCollection[0].instrument.description,
                                        ClosingOrOpening: ordersInfo[x].orderLegCollection[0].positionEffect,
                                        Symbol: ordersInfo[x].orderLegCollection[0].instrument.symbol,
                                    }

                            ordersArr.push(order);
                    }
                })


                var transInfo;
                var trans;
                var transArr = [];
                var expTrans;
                var expTransArr = [];
                var usedOptionExpiredNumsArr = [];
                rp(transUrl) 
                .then(function (transactions) {
                    transInfo = JSON.parse(transactions);
                    transInfo.reverse();

                    for (var e = 0; x < transInfo.length; x++) {
                        if (transInfo[e].transactionSubType === "OE") {
                            usedOptionExpiredNumsArr.push(e);
                            for (var i = 0; i < transInfo.length; i++) {
                                if (transInfo[i].transactionItem.instrument.cusip === transInfo[e].transactionItem.instrument.cusip) {
                                    usedOptionExpiredNumsArr.push(i);
                                }
                            }
                        }
                    }

                    for (var x = 0; x < transInfo.length; x++) {
                        if (transInfo[x].orderId !== undefined) {
                            trans = {
                                        TransType: transInfo[x].type,
                                        OrderId: transInfo[x].orderId,
                                        OrderIdShort: transInfo[x].orderId.substring(1,11),
                                        TransNetAmount: transInfo[x].netAmount,
                                        TransDate: transInfo[x].transactionDate,
                                        OrderDate: transInfo[x].orderDate,
                                        TransSubType: transInfo[x].transactionSubType,
                                        TransId: transInfo[x].transactionId,
                                        TransDescription: transInfo[x].description,
                                        TransAmount: transInfo[x].transactionItem.amount,
                                        TransPrice: transInfo[x].transactionItem.price,
                                        TransCost: transInfo[x].transactionItem.cost,
                                        OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                        TransSymbol: transInfo[x].transactionItem.instrument.symbol,
                                        TransUnderlying: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                        TransExpDate: transInfo[x].transactionItem.instrument.optionExpirationDate,
                                        PutOrCall: transInfo[x].transactionItem.instrument.putCall,
                                        TransCusip: transInfo[x].transactionItem.instrument.cusip,
                                        OptionDescription: transInfo[x].transactionItem.instrument.description
                                    }
                            transArr.push(trans);
                        }
                        
                    }
                    for (var e = 0; e < transInfo.length; e++) {
                        if (transInfo[e].transactionSubType === "OX" || transInfo[e].transactionSubType === "OE" || usedOptionExpiredNumsArr.indexOf(x) > -1) {
                            expTrans = {
                                        ExpTransType: transInfo[e].type,
                                        ExpTransNetAmount: transInfo[e].netAmount,
                                        ExpTransDate: transInfo[e].transactionDate,
                                        ExpTransSubType: transInfo[e].transactionSubType,
                                        ExpTransId: transInfo[e].transactionId,
                                        ExpTransDescription: transInfo[e].description,
                                        ExpTransAmount: transInfo[e].transactionItem.amount,
                                        ExpTransCost: transInfo[e].transactionItem.cost,
                                        ExpTransExpDate: transInfo[e].transactionItem.instrument.optionExpirationDate,
                                        ExpTransCusip: transInfo[e].transactionItem.instrument.cusip
                                    }
                            expTransArr.push(expTrans);
                        }
                    }
                    
                })
                .then(function() { 

                    // var match;
                    // var matchedTradesArr = [];
                    // var orderIdUsedNumsArr = [];
                    // for (var x = 0; x < ordersArr.length; x++) {
                    //     for (var i = 0; i < transArr.length; i++) {
                    //         match = ordersArr[x].OrderId.toString();
                    //         if (match === transArr[i].OrderIdShort){
                    //             matchedTradesArr.push(ordersArr[x]);
                    //             matchedTradesArr.push(transArr[i]);
                    //         }
                    //     }
                    // }
                    // for (var e = 0; e < expTransArr.length; e++) {
                    //     matchedTradesArr.push(expTransArr[e]);
                    // }
                    // console.log(matchedTradesArr)

                    // res.render('tradeInput', {Trades: matchedTradesArr, TimeCreate: dateTime})
                    res.render('tradeInput', {Orders: ordersArr, Trans: transArr, ExpTrans: expTransArr, TimeCreate: dateTime})
                })
                .catch(function (err) {
                    // API call failed...
                });

                // var again;
                // var testFunc = rp(ordersUrl, async function(err, response, body) {
                    
                //     again = await JSON.parse(body);

                //     // console.log(again)
                //     res.render('tradeInput', {Orders: again, TimeCreate: dateTime})
                // })

                

                // console.log(testFunc)
                
                
                // console.log(testStuff)

                // var foo;
                // var boo;


                // var foo = request.get(ordersUrl, async function(err, res, body) {

                //         return await body
                //     })
                    // console.log(foo)

                // stuff();
            //    console.log(stuff());
            // stuff().then(console.log(boo))

            // console.log(foo)

            // function foo() 

                    // console.log(foo)


            //    async function doAsync() {
            //     return await someAsyncAction()
            // }

                
                
               

                    // request(options, function(error, response, body) {

                    //     if (!error && response.statusCode == 200) {

                    //         var allTrades = JSON.parse(body);

                    //         // console.log(allTrades)

                    //         allTrades.reverse();
                    //         var order;
                    //         var allTradesArr = [];
                    //         var ordersArr = [];
                    //         var trans;
                    //         var transArr = [];
                    //         var expTrans;
                    //         var expTransArr = [];
                    //         var usedOptionExpiredNumsArr = [];

                    //         for (var x = 0; x < allTrades.length; x++)  {
                    //             if (allTrades[x].transactionSubType === "OE") {
                    //                 for (var e = 0; e < allTrades.length; e++) {
                    //                     if ((allTrades[e].type === "TRADE" || allTrades[e].type === "RECEIVE_AND_DELIVER") && allTrades[e].transactionItem.instrument.cusip === allTrades[x].transactionItem.instrument.cusip) {
                    //                         usedOptionExpiredNumsArr.push(e);
                    //                     }
                    //                 }
                    //             }
                    //         }

                            // for (var x = 0; x < allTrades.length; x++) {

                            //     if (allTrades[x].orderType !== undefined) {
                            //         order = {
                            //                     OrderDate: allTrades[x].closeTime,
                            //                     OrderId: allTrades[x].orderId,
                            //                     OrderType: allTrades[x].orderType,
                            //                     ComplexOrderType: allTrades[x].complexOrderStrategyType,
                            //                     OrderQuantity: allTrades[x].quantity,
                            //                     OrderPrice: allTrades[x].price,
                            //                     OrderDescription: allTrades[x].orderLegCollection[0].instrument.description,
                            //                     ClosingOrOpening: allTrades[x].orderLegCollection[0].positionEffect,
                            //                     Symbol: allTrades[x].orderLegCollection[0].instrument.symbol,
                            //                 }
                            //         // console.log("this is ORDER")
                            //         // console.log(order)
                            //         ordersArr.push(order);
                            //     }

                    //             if (allTrades[x].type === "TRADE" && usedOptionExpiredNumsArr.indexOf(x) === -1) {
                    //                 trans = {
                    //                             TransType: allTrades[x].type,
                    //                             OrderId: allTrades[x].orderId,
                    //                             OrderIdShort: allTrades[x].orderId.substring(1,11),
                    //                             TransNetAmount: allTrades[x].netAmount,
                    //                             TransDate: allTrades[x].transactionDate,
                    //                             OrderDate: allTrades[x].orderDate,
                    //                             TransSubType: allTrades[x].transactionSubType,
                    //                             TransId: allTrades[x].transactionId,
                    //                             TransDescription: allTrades[x].description,
                    //                             TransAmount: allTrades[x].transactionItem.amount,
                    //                             TransPrice: allTrades[x].transactionItem.price,
                    //                             TransCost: allTrades[x].transactionItem.cost,
                    //                             OpeningOrClosing: allTrades[x].transactionItem.positionEffect,
                    //                             TransSymbol: allTrades[x].transactionItem.instrument.symbol,
                    //                             TransUnderlying: allTrades[x].transactionItem.instrument.underlyingSymbol,
                    //                             TransExpDate: allTrades[x].transactionItem.instrument.optionExpirationDate,
                    //                             PutOrCall: allTrades[x].transactionItem.instrument.putCall,
                    //                             TransCusip: allTrades[x].transactionItem.instrument.cusip,
                    //                             OptionDescription: allTrades[x].transactionItem.instrument.description
                    //                         }

                    //                     // console.log("this is TRANS")
                    //                     // console.log(trans)
                    //                     transArr.push(trans);
                                    
                    //             }
                    //             if (allTrades[x].transactionSubType === "OX" || allTrades[x].transactionSubType === "OE" || usedOptionExpiredNumsArr.indexOf(x) > -1) {
                    //                 expTrans = {
                    //                             TransType: allTrades[x].type,
                    //                             OrderId: allTrades[x].orderId,
                    //                             TransNetAmount: allTrades[x].netAmount,
                    //                             TransDate: allTrades[x].transactionDate,
                    //                             TransSubType: allTrades[x].transactionSubType,
                    //                             TransId: allTrades[x].transactionId,
                    //                             TransDescription: allTrades[x].description,
                    //                             TransAmount: allTrades[x].transactionItem.amount,
                    //                             TransCost: allTrades[x].transactionItem.cost,
                    //                             TransExpDate: allTrades[x].transactionItem.instrument.optionExpirationDate,
                    //                             TransCusip: allTrades[x].transactionItem.instrument.cusip
                    //                         }

                    //                     // console.log("this is EXP TRANS")
                    //                     // console.log(expTrans)
                    //                     expTransArr.push(expTrans);
                                    
                    //             }
                    //         }

                    //         var match;
                    //         var matchedTradesArr = [];

                    //         // var matchTradesFunc = function(value, num) {

                    //         // }

                    //         // for (var x = 0; x < ordersArr.length; x++) {
                    //         //     var trade = ordersArr[x].OrderId.toString();
                    //         //     for (var e = 0; e < transArr.length; e++) {
                    //         //         if (trade === transArr[e].OrderIdShort) {
                    //         //             console.log("match")
                    //         //             matchedTradesArr.push(ordersArr[x]);
                    //         //             matchedTradesArr.push(transArr[e]);

                    //         //         }
                    //         //     }
                    //         // }

                    //         for (var x = 0; x < transArr.length; x++) {
                    //             if (transArr[x].OrderIdShort === "2022941247") {
                    //                 console.log('found it')
                    //                 console.log(ordersArr[5].OrderId)
                    //             }
                    //         }

                    //         console.log(matchedTradesArr);
                    //         // console.log(ordersArr)
                    //         // console.log(transArr)

                            
                    //         // for (var x = dbRows; x < ordersInfo.length; x++) {
                                
                                
                    //         //     trade = {
                    //         //                 OrderDate: ordersInfo[x].closeTime,
                    //         //                 OrderId: ordersInfo[x].orderId,
                    //         //                 ClosingOrOpening: ordersInfo[x].orderLegCollection[0].positionEffect,
                    //         //                 Symbol: ordersInfo[x].orderLegCollection[0].instrument.symbol,
                    //         //                 Price: ordersInfo[x].price,
                    //         //                 Quantity: ordersInfo[x].quantity,
                    //         //                 ClosingFilledQuantity: ordersInfo[x].filledQuantity,
                    //         //                 ComplexOrderType: ordersInfo[x].complexOrderStrategyType,
                    //         //                 OrderType: ordersInfo[x].orderType,
                    //         //                 OrderDescription: ordersInfo[x].orderLegCollection[0].instrument.description
                    //         //     };

                    //         //     allTradesArr.push(trade);

                    //         };  // END Request IF

                    // //         for (var x = 0; x < dbTradesArr.length; x++) {
                                
                    // //             for (var i = 0; i < ordersInfo.length; i++) {

                    // //                 if (dbTradesArr[x].OrderId === ordersInfo[i].orderId) {
                                        
                    // //                     dbTradesArr[x].OrderDate = ordersInfo[i].closeTime;
                    // //                     dbTradesArr[x].ClosingOrOpening = ordersInfo[i].orderLegCollection[0].positionEffect;
                    // //                     dbTradesArr[x].Symbol = ordersInfo[i].orderLegCollection[0].instrument.symbol;
                    // //                     dbTradesArr[x].Price = ordersInfo[i].price;
                    // //                     dbTradesArr[x].OrderType = ordersInfo[i].orderType;
                    // //                     dbTradesArr[x].OrderDescription = ordersInfo[i].orderLegCollection[0].instrument.description;
                    // //                 }

                    // //             }


                    // //         }



                    // //         // for (var x = 0; x < ordersInfo.length; x++) {
                                
                    // //         //     pool.query('INSERT INTO Orders SET ?', {OrderDate: ordersInfo[x].closeTime, OrderDescription: ordersInfo[x].orderLegCollection[0].instrument.description}, function (error, rows, fields) {
                    // //         //         console.log('Database Updated')

                    // //         //         if (error) {
                    // //         //             console.log(error)
                    // //         //         }

                    // //         //     });
                    // //         // }

                    //         // console.log(ordersArr)
                                        
                        // res.render('tradeInput', {Orders: ordersArr, Trans: transArr, ExpTrans: expTransArr, TimeCreate: dateTime});
                    


                    // }); 


            // }); //Tokens Pool End

        }); //Orders Pool End

        // res.render('tradeInput', {});

    };

    var putTradeInput = function(req, res) {

        // var tradeStuff = JSON.parse(req.body);

        // console.log(req.body)

        if (req.body.orderDate !== undefined) {

            for (var x = 0; x < req.body.tradeId.length; x++) {

                if (req.body.tradeId[x] > 0) {

                    var dbFields =  {
                                        TradeId: req.body.tradeId[x], 
                                        OrderId: req.body.orderId[x], 
                                        OrderDate: req.body.orderDate[x]
                    };
                                
                    pool.query('INSERT INTO CompletedOrderTrades SET ?', [dbFields], function (error, rows, fields) {
                        console.log('Database Updated')

                        if (error) {
                            console.log(" This is an error " + error)
                        }

                    });

                }
            }
        }

        if (req.body.transDate !== undefined) {

            for (var x = 0; x < req.body.tradeId.length; x++) {

                if (req.body.tradeId[x] > 0) {

                    var dbFields =  {
                                        TradeId: req.body.tradeId[x],
                                        OrderIdShort: req.body.orderIdShort[x], 
                                        TransId: req.body.transId[x], 
                                        TransDate: req.body.transDate[x]        
                    };

                    pool.query('INSERT INTO CompletedTransTrades SET ?', [dbFields], function (error, rows, fields) {
                        console.log('Database Updated')

                        if (error) {
                            console.log(" This is an error " + error)
                        }

                    });

                }
            }
        }

        if (req.body.expTransDate !== undefined) {

            for (var x = 0; x < req.body.tradeId.length; x++) {

                if (req.body.tradeId[x] > 0) {

                    var dbFields =  {
                                        TradeId: req.body.tradeId[x],
                                        ExpTransId: req.body.expTransId[x],
                                        ExpTransDate: req.body.expTransDate[x],
                                        ExpTransCusip: req.body.expTransCusip[x],
                                        ExpTransDescription: req.body.expTransDescription[x]
                    };
    
                    pool.query('INSERT INTO CompletedExpTransTrades SET ?', [dbFields], function (error, rows, fields) {
                        console.log('Database Updated')

                        if (error) {
                            console.log(" This is an error " + error)
                        }

                    });

                }
            }
        }
        
        // let stockSymbol = req.body.stockSymbol;                                                     
        // let soldDate = req.body.soldDate;
        // let soldQuantity = req.body.soldQuantity;
        // let soldPrice = req.body.soldPrice;
        // let soldCommission = req.body.soldCommission;
        // let soldTotal = req.body.soldTotal;
        // let soldStockPrice = req.body.soldStockPrice;
        // let custId = req.params.id;
        
        // pool.query('INSERT INTO Purchased SET StockSymbol = ?, SoldDate = ?, SoldQuantity = ?, SoldPrice = ?, SoldCommission = ?, SoldTotal = ?, SoldStockPrice = ?', [stockSymbol, soldDate, soldQuantity, soldPrice, soldCommission, soldTotal, soldStockPrice], function(err, results, fields) {
        //     if (err) {
        //         console.log(err);
        //     }   
    
        //     if(!req.body) {
        //         res.status(400).send('Bad Request Bro Bro');
        //     return;
        //     }


        //     pool.query('INSERT INTO Trades SET StockSymbol = ?, SoldID = ?', [stockSymbol, results.insertId], function(err, results, fields) {
        //         if (err) {
        //             console.log(err);
        //         }
        //     });

    
        //     pool.query('SELECT * FROM Trades LEFT OUTER JOIN Sold ON Sold.ID = Trades.SoldID INNER JOIN Purchased ON Purchased.ID = Trades.PurchasedID', function(err, rows, fields) {
        //         if (err) {
        //             console.log(err);
        //         };
    
        //         // for (let i = 0; i < purchasedTrades.length; i++ ) {
        //         //     total = purchasedTrades[i].Total + total;
        //         // }
    
        //         res.render('trades', { Trades: rows, TimeCreate: dateTime });

        //         console.log(rows);
    
        //     });
            
        //     console.log(results.insertId);


        // if(!req.body) {
        //     res.status(400).send('Bad Request');
        // return;
        // }

        // console.log(req.body);

        // res.render('assignTrades', {Trades: rows });

            
        // });
    };

    var getCompTrades = function(req, res) {

        var dbTradesArr = [];
        var dbTrades;
        
        pool.query('SELECT * FROM CompletedTransTrades', function(err, rows, fields) {
        
            if (err) {
                console.log(err)
            }

            console.log(rows)

            for (var x = 0; rows.length; x++) {

                dbTrades = {
                                ID: rows[x].ID,
                                TradeId: rows[x].TradeId,
                                OrderIdShort: rows[x].OrderIdShort,
                                TransId: rows[x].TransId,
                                TransDate: rows[x].TransDate
                            };
                            
                dbTradesArr.push(dbTrades);
            
            }

            pool.query('SELECT * FROM CompletedExpTransTrades', function(err, rows, fields) {

                if (err) {
                    console.log(err)
                }

                for (var x = 0; rows.length; x++) {

                    dbTrades = {
                                    ID: rows[x].ID,
                                    TradeId: rows[x].TradeId,
                                    ExpTransId: rows[x].ExpTransId,
                                    ExpTransDate: rows[x].ExpTransDate,
                                    ExpTransCusip: rows[x].ExpTransCusip,
                                    ExpTransDescription: rows[x].ExpTransDescription
                                }

                    dbTradesArr.push(dbTrades);

                }

                

            

            // for(var x = 0; x < dbTradesArr.length; x++) {
            //     console.log(dbTradesArr[x])
            // }

            // console.log(dbTradesArr)


            pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
            
                var headers = {
                    'Authorization': `Bearer ${rows[0].AccessToken}`
                }

                var transUrl = {
                                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-19&endDate=2018-12-12', // IRA
                                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=ALL&startDate=2018-11-19&endDate=2019-02-11', // TTi
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
                var ordersUrl = {
                                     // url: 'https://api.tdameritrade.com/v1/accounts/491442567/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // IRA
                                    // url: 'https://api.tdameritrade.com/v1/accounts/494120489/transactions?type=TRADE&startDate=2018-11-01&endDate=2018-12-13', // TTi
                                    url: 'https://api.tdameritrade.com/v1/accounts/494120489/orders?fromEnteredTime=2018-11-19&toEnteredTime=2019-02-11&status=FILLED', // TTi
                                    // url: 'https://api.tdameritrade.com/v1/accounts/491442567/orders?fromEnteredTime=2018-11-19&toEnteredTime=2018-12-30&status=FILLED', // IRA
                                    method: 'GET',
                                    headers: headers,
                                            //POST Body params
                                        // query: {
                                        //     'maxResults': null,
                                        //     'fromEnteredTime': '2018-02-01',
                                        //     'toEnteredTime': '2018-03-24',
                                        //     'status': 'FILLED'
                                        // }
                                        // json: true
                }


                // var ordersInfo;
                // var order;
                // var ordersArr = [];
                var compTradesArr = [];

                // rp(ordersUrl)
                // .then(function (orders) {                   
                //     ordersInfo = JSON.parse(orders);
                    
                //     var usedOrderNumsArr = [];
                //     for (var x = 0; x < ordersInfo.length; x++) {
                //         for (var i = 0; i < dbTrades.length; i++) {
                //             if (ordersInfo[x].orderId === parseInt(dbTrades[i].OrderId) && usedOrderNumsArr.indexOf(x) === -1) {

                //                 order = {
                //                             TradeId: dbTrades[i].TradeId,
                //                             OrderDate: ordersInfo[x].closeTime,
                //                             OrderId: ordersInfo[x].orderId,
                //                             OrderType: ordersInfo[x].orderType,
                //                             ComplexOrderType: ordersInfo[x].complexOrderStrategyType,
                //                             OrderQuantity: ordersInfo[x].quantity,
                //                             OrderPrice: ordersInfo[x].price,
                //                             OrderDescription: ordersInfo[x].orderLegCollection[0].instrument.description,
                //                             ClosingOrOpening: ordersInfo[x].orderLegCollection[0].positionEffect,
                //                             Symbol: ordersInfo[x].orderLegCollection[0].instrument.symbol,
                //                 };
                                
                //                 compTradesArr.push(order);
                //                 usedOrderNumsArr.push(x);
                //                 // console.log(compTradesArr)
                //             }; 
                //         };
                //     };                          
                // })

                console.log(dbTradesArr)


                var transInfo;
                var trans;
                var transArr = [];
                var expTrans;
                var expTransArr = [];
                var usedOptionExpiredNumsArr = [];
                rp(transUrl) 
                .then(function (transactions) {
                    transInfo = JSON.parse(transactions);

                    // for (var e = 0; x < transInfo.length; x++) {
                    //     if (transInfo[e].transactionSubType === "OE") {
                    //         usedOptionExpiredNumsArr.push(e);
                    //         for (var i = 0; i < transInfo.length; i++) {
                    //             if (transInfo[i].transactionItem.instrument.cusip === transInfo[e].transactionItem.instrument.cusip) {
                    //                 usedOptionExpiredNumsArr.push(i);
                    //             }
                    //         }
                    //     }
                    // }

                    var usedTransNumsArr = [];
                    for (var x = 0; x < transInfo.length; x++) {
                        for (var i = 0; i < dbTradesArr.length; i++) {
                            if (transInfo[x].transactionId === parseInt(dbTradesArr[i].TransId) && usedTransNumsArr.indexOf(x) === -1) {
                                console.log('trans')
                                trans = {
                                            TradeId: dbTradesArr[i].TradeId,
                                            TransType: transInfo[x].type,
                                            OrderId: transInfo[x].orderId,
                                            OrderIdShort: transInfo[x].orderId.substring(1,11),
                                            TransNetAmount: transInfo[x].netAmount,
                                            TransDate: transInfo[x].transactionDate,
                                            OrderDate: transInfo[x].orderDate,
                                            TransSubType: transInfo[x].transactionSubType,
                                            TransId: transInfo[x].transactionId,
                                            TransDescription: transInfo[x].description,
                                            TransAmount: transInfo[x].transactionItem.amount,
                                            TransPrice: transInfo[x].transactionItem.price,
                                            TransCost: transInfo[x].transactionItem.cost,
                                            OpeningOrClosing: transInfo[x].transactionItem.positionEffect,
                                            TransSymbol: transInfo[x].transactionItem.instrument.symbol,
                                            TransUnderlying: transInfo[x].transactionItem.instrument.underlyingSymbol,
                                            TransExpDate: transInfo[x].transactionItem.instrument.optionExpirationDate,
                                            PutOrCall: transInfo[x].transactionItem.instrument.putCall,
                                            TransCusip: transInfo[x].transactionItem.instrument.cusip,
                                            OptionDescription: transInfo[x].transactionItem.instrument.description
                                        };
                                        // console.log(error)
                                        compTradesArr.push(trans);
                                        usedTransNumsArr.push(x);
                            }
                        }
                    }

                    var usedExpNumsArr = [];
                    for (var e = 0; e < transInfo.length; e++) {
                        for (var a = 0; a < dbTradesArr.length; a++) {
                            if (transInfo[e].transactionId === parseInt(dbTradesArr[a].ExpTransId) && usedExpNumsArr.indexOf(e) === -1) {

                                expTrans = {
                                                TradeId: dbTradesArr[a].TradeId,
                                                ExpTransType: transInfo[e].type,
                                                ExpTransNetAmount: transInfo[e].netAmount,
                                                ExpTransDate: transInfo[e].transactionDate,
                                                ExpTransSubType: transInfo[e].transactionSubType,
                                                ExpTransId: transInfo[e].transactionId,
                                                ExpTransDescription: transInfo[e].description,
                                                ExpTransAmount: transInfo[e].transactionItem.amount,
                                                ExpTransCost: transInfo[e].transactionItem.cost,
                                                ExpTransExpDate: transInfo[e].transactionItem.instrument.optionExpirationDate,
                                                ExpTransCusip: transInfo[e].transactionItem.instrument.cusip
                                            };
                                        
                                           compTradesArr.push(expTrans);
                                           usedExpNumsArr.push(e);
                            }
                        }
                    }
                    
                })
                .then(function() { 
                    
                    // var compTradesArr = [];
                    // for (var x = 0; x < ordersArr.length; x++) {
                    //     for (var i = 0; i < dbTrades.length; i++) {
                    //         // console.log(typeof ordersArr[x].OrderId)
                    //         // console.log(typeof dbTrades[i].OrderId)
                    //         if (ordersArr[x].OrderId === parseInt(dbTrades[i].OrderId)) {
                    //             compTradesArr.push(ordersArr[x])
                    //         }
                    //     }
                    // }
                    // for (var x = 0; x < transArr.length; x++) {
                    //     for (var i = 0; i < dbTrades.length; i++) {
                    //         if (transArr[x].TransId === dbTrades[i].TransId) {
                    //             compTradesArr.push(transArr[x])
                    //         }
                    //     }
                    // }


                    // console.log(compTradesArr)
                    res.render('compTrades', {Trades: compTradesArr, TimeCreate: dateTime})
                })
                .catch(function (err) {
                    // API call failed...
                });


            // res.render('compTrades', {Trades: rows, TimeCreate: dateTime})

            });

            });

        });

    };
            

    router.route('/trans').get(getTradesByTrans);
    router.route('/orders').get(getTradesByOrder);
    router.route('/assignTrades').get(getAssignTrades);
    router.route('/tradeInput').get(getTradeInput);
    router.route('/tradeInput').post(putTradeInput);
    router.route('/compTrades').get(getCompTrades);
    return router;

};