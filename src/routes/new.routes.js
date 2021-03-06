const dateTime = require('node-datetime');
var dateFormat = require('dateformat');
const pool = require('../db.connection.js');
const request = require('request');

module.exports = function(router) {

    var getTradesByCloseDate = function(req, res) {
            
            var categoryType = req.query.category;


                console.log('getOrdersUpdate');
                pool.query('SELECT * FROM Tokens', function(err, rows, fields) {
                
                    var headers = {
                        'Authorization': `Bearer ${rows[0].AccessToken}`
                    }
        
                    var options = {
                        url: 'https://api.tdameritrade.com/v1/accounts//orders?fromEnteredTime=2017-02-01&toEnteredTime=2018-03-31&status=FILLED',
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

                            var openTrades = {};
                            var closedTrades = {};
        
                            // var ordersReply = JSON.parse(body);
                            var ordersInfo = JSON.parse(body);
                            
                            for (var x = 0; x < ordersInfo.length; x++) {
                                if (ordersInfo[x].orderLegCollection[0].positionEffect === "OPENING") {
                                    // for (var i = 0; i < orderInfo[x].orderLegCollection.length; i++) {
                                    //     var openCusip = orderInfo[x].orderLegCollection[i].instrument.cusip;
                                    //     var openDesc = orderInfo[x].orderLegCollection[i].instrument.description;
                                    // }
                                    openTrades.price = ordersInfo[x].price;
                                    openTrades.openQuantity = ordersInfo[x].fillledQuantity;
                                    openTrades.openDate = ordersInfo[x].closeTime;
                                }
                            }

                        }
                        console.log(openTrades);
                    

                    
                    
                    function errorHandler (err, req, res, next) {
                        res.status(500)
                        res.render('error', { error: err })
                    }
        
                
        
                // res.render('index');

                
                
                // var setOptionNumsFunc = function(value) {
                //     var counter = 0;
                //     var idArr = [];

                //     if (value === null) {
                //         return;
                //     }
                //     for (var i = 0; i < tradeInfo.length; i++) {
                //         if (tradeInfo[i].TradeID === value) {
                //             counter++;
                //             idArr.push(tradeInfo[i].ID);
                //         }                      
                //     }
                //     if (idArr.length > 1) {
                //         var e = 0;
                //         for (var x = 0; x < tradeInfo.length; x++) {
                //             for (e = 0; e < idArr.length; e++) {
                //                 if (tradeInfo[x].ID === idArr[e]) {
                //                     tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                //                 }
                //             }  
                //         }
                        
                //     }
                // }

                
                // var getWeekFunc = function(x, week, month) {
                //     if (week) {
                //         tradeInfo[x].Week = dateFormat(week, "W")
                //     }
                //     if (month) {
                //         tradeInfo[x].Month = dateFormat(month, "mmmm")
                //     }
                // }

                
                //=== SetTotals Function will take the price, OptionSet number, tradeID and add its price to the trade that is directly below it in OptionSet number. Example
                //if there is 3 options a part of the set then if the 3rd trade is passed it in will take its current close price and add it to all trades below it so trade 
                //OptionSet #2 then #1. The reason for this is when options are scaled out of then the options are sold individually and to show how much was made on the trade
                //you need to take lets say 2 option close price and add it to the 1st option close price then subtract it to the open price of the original trade so you know
                //how much was made on the total trade. You can't just take the close price of each scaled out of options and subtract them each from sale price of the OG trade.
                //Example is if you buy 3 options for a total of $300 and sell the first one for $100 minus $300 then you are still $200 in the whole and you sell the 2nd one for
                //$200 now you are even and the 3rd now all profit. So adding the 2nd and 1st option close price together lets you know where you are at in the OG trade.
                
                var getSetTotalsFunc = function(price, optionSetNum, closeTradeId) {
                    
                    if (optionSetNum > 1) {
                        var optionPriceTotal = 0;
                        for (var e = optionSetNum; e >= optionSetNum; e--) {
                            for (var i = 0; i < tradeInfo.length; i++) {
                                if (tradeInfo[i].TradeID === closeTradeId && tradeInfo[i].OptionSet === (optionSetNum - 1)) {
                                    optionSetNum--;
                                    optionPriceTotal += tradeInfo[i].ClosePrice;                                
                                }
                            }                        
                        }
                        return optionPriceTotal + price;
                    }
                }


                var tradeStatus = function(x) {
                    if (tradeInfo[x].CloseDate === null) {
                        tradeInfo[x].TradeStatus = "Open";
                    }
                    if (tradeInfo[x].CloseDate !== null) {
                        tradeInfo[x].TradeStatus = "Closed";
                    }              
                }
                
                
                var getPercentageFunc = function(x, openPrice, status, optionSetTotal) {
                    var getPercentage = 0;
                        
                        if (status === 'Closed' && !optionSetTotal) {
                            getPercentage = tradeInfo[x].GainLoss / Math.abs(openPrice) * 100;
                            tradeInfo[x].PercentageGainLost = Math.round(getPercentage);
                            getPercentage = 0;
                        }
                        if (status === 'Closed' && optionSetTotal) {
                            getPercentage = tradeInfo[x].OptionSetTotal / Math.abs(openPrice) * 100;
                            tradeInfo[x].PercentageGainLost = Math.round(getPercentage);
                            getPercentage = 0;
                        }
                }


                var winLossPercentage = 0;
                var usedRatioArr = [];
                var totalWins = 0;
                var totalLosses = 0;
                var getWinLossRatioFunc = function(win, loss, category, fooValue) {
                    var wins = 0;
                    var losses = 0;
                
                    for (var x in tradeInfo) {

                        if (tradeInfo[x].PercentageGainLost >= 0 && tradeInfo[x].TradeStatus === 'Closed' && tradeInfo[x].OptionSet === undefined && tradeInfo[x][category] === fooValue) {
                            wins++;                        
                        }
                        if (tradeInfo[x].PercentageGainLost < 0 && tradeInfo[x].TradeStatus === 'Closed' && tradeInfo[x].OptionSet === undefined && tradeInfo[x][category] === fooValue) {
                            losses++;
                        }
                        if (tradeInfo[x].OptionSet !== undefined && tradeInfo[x][category] === fooValue) {
                            var ratioArr = [];
                            var value;
                            for (var i in tradeInfo) {
                                if (tradeInfo[i].TradeID === tradeInfo[x].TradeID) {
                                    value = {
                                                TradeId: tradeInfo[i].TradeID,
                                                Per: tradeInfo[i].PercentageGainLost,
                                                TableId: tradeInfo[i].ID
                                            }
                                    ratioArr.push(value);                                
                                }
                            }
                            for (var e = 0; e < ratioArr.length; e++) {
                                if (ratioArr[e].Per >= 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1) {
                                    wins++;
                                    usedRatioArr.push(ratioArr[e].TradeId);
                                    break;
                                }
                                if (ratioArr[e].Per < 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1 && e + 1 === ratioArr.length) {
                                    losses++;
                                    usedRatioArr.push(ratioArr[e].TradeId);
                                }
                            }
        
                        } 
                    }
                    if (win) {
                        totalWins += wins;
                        return wins;
                    }
                    if (loss) {
                        totalLosses += losses;
                        return losses;
                    }
                };

                
                
                var currentCatArr = [];
                var catBuildArr = [];
                var cat;
                var catBuilderFunc = function(x, category) {

                    setOptionNumsFunc(tradeInfo[x].TradeID);
                    tradeStatus(x);
                    getWeekFunc(x, tradeInfo[x].CloseDate);
                    getWeekFunc(x, false, tradeInfo[x].CloseDate);
                    tradeInfo[x].OptionSetTotal = getSetTotalsFunc(tradeInfo[x].ClosePrice, tradeInfo[x].OptionSet, tradeInfo[x].TradeID) + tradeInfo[x].OpenPrice;
                    tradeInfo[x].GainLoss = tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice;
                    getPercentageFunc(x, tradeInfo[x].OpenPrice, tradeInfo[x].TradeStatus, tradeInfo[x].OptionSetTotal);
                    tradeInfo[x].SelectedCat = category;
                    
                    cat = tradeInfo[x][category];
                    
                    if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                        currentCatArr.push(tradeInfo[x][category]);
                    }       
                }
                
                    
                
                for (var x in tradeInfo) {
                    catBuilderFunc(x, categoryType);
                }



                var currentCatTotalsArr = [];
                var overallTotal = 0;
                var catTotalsBuilder = function(category) {
                    var catTotal = 0;
                    var openTradesTotal = 0;
                    var cat;
                    var credit = 0;
                    var debit = 0;
                    var openTotal = 0;
                    var avgPercentage = 0;
                    var counter = 0;
                    var month;
                    var wins = 0;
                    var losses = 0; 
                    var winLossUsedArr =[];         

                    for (var x = 0; x < currentCatArr.length; x++) {
                        for (var i in tradeInfo) {
                            if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet === undefined && tradeInfo[i].TradeStatus === 'Closed') {
                                catTotal += tradeInfo[i].GainLoss;
                                openTotal += Math.abs(tradeInfo[i].OpenPrice);
                                avgPercentage += tradeInfo[i].PercentageGainLost;
                                counter++;
                            }
                            if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet < 2) {
                                catTotal += tradeInfo[i].GainLoss;
                            }
                            if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet > 1) {
                                catTotal += tradeInfo[i].ClosePrice;
                            }
                            if (tradeInfo[i].TradeStatus === 'Open') {
                                openTradesTotal += tradeInfo[i].OpenPrice;
                            }
                            if (tradeInfo[i].CreditDebit === 'Credit' && tradeInfo[i].TradeStatus === 'Open') {
                                credit += tradeInfo[i].OpenPrice;
                            }
                            if (tradeInfo[i].CreditDebit === 'Debit' && tradeInfo[i].TradeStatus === 'Open') {
                                debit += tradeInfo[i].OpenPrice;
                            }
                            if (currentCatArr[x] === tradeInfo[i][category] && winLossUsedArr.indexOf(tradeInfo[i][category]) === -1) {
                                month = tradeInfo[i].Month;
                                wins += getWinLossRatioFunc(true, false, category, tradeInfo[i][category]);
                                losses += getWinLossRatioFunc(false, true, category, tradeInfo[i][category]);
                                winLossUsedArr.push(tradeInfo[i][category]);
                            }
                        }

                        overallTotal += catTotal;

                        cat = {
                            Cat: currentCatArr[x],
                            Month: month,
                            CatTotal: catTotal,
                            OpenTradesTotal: openTradesTotal,
                            Credit: credit,
                            Debit: debit,
                            catPercentage: Math.round(catTotal / openTotal * 100),
                            AvgPercentage: Math.round(avgPercentage / counter),
                            Wins: wins,
                            Losses: losses,
                            WinLossPercent: Math.round(wins / (wins + losses) * 100),
                            SelectedCat: category
                        };
                        currentCatTotalsArr.push(cat);
                        catTotal = 0;
                        openTradesTotal = 0;
                        credit = 0;
                        debit = 0;
                        openTotal = 0;
                        avgPercentage = 0;
                        counter = 0;
                        month = "";
                        wins = 0;
                        losses = 0;
                    }
                }

                catTotalsBuilder(categoryType);


                var totals = {
                    OverallTotal: overallTotal + 107977,
                    TotalWins: totalWins,
                    TotalLosses: totalLosses,
                    WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
                };

                
                // console.log(tradeInfo);
                // console.log(currentCatTotalsArr);
                // console.log(currentWeekTotalsArr);
                res.render('trades_by_closedate', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
                
            }); //End Request Func

        }); //End Pool Func    

    }; // End Var get trades

        


    router.route('/trades_by_closedate').get(getTradesByCloseDate);
    return router;

};
