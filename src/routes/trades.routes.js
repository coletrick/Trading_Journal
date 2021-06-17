const pool = require('../db.connection.js');
const dateTime = require('node-datetime');
var dateFormat = require('dateformat');


module.exports = function(router) {
    var tradeInfo;

    //============================================================================================================================================
    //======================================================= BY TICKER ========================================================================
    //============================================================================================================================================

    var getTradesByTicker = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'Ticker');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('Ticker');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            res.render('trades_by_ticker', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    var getTradesByWeek = function(req, res) { 


        pool.query('SELECT * FROM OpenTrades ORDER BY OpenDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };
        });

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(week, month) {
                if (week) {
                    return dateFormat(week, "W")
                }
                if (month) {
                   return dateFormat(month, "mmmm")
                }
            }

            
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
                    tradeInfo[x].Status = "Open";
                }
                if (tradeInfo[x].CloseDate !== null) {
                    tradeInfo[x].Status = "Closed";
                }              
            }  
            
            
            var currentWeekArr = [];
            var weekBuildArr = [];
            var week;
            var weekBuilderFunc = function(x) {
                var trade;

                setOptionNumsFunc(tradeInfo[x].TradeID);
                tradeStatus(x);

                trade = {
                            Week: getWeekFunc(tradeInfo[x].CloseDate),
                            Month: getWeekFunc(false, tradeInfo[x].CloseDate),
                            Ticker: tradeInfo[x].Ticker,
                            TradeId: tradeInfo[x].TradeID,
                            TableId: tradeInfo[x].ID,
                            OpenDate: tradeInfo[x].OpenDate,
                            CloseDate: tradeInfo[x].CloseDate,
                            OpenDesc: tradeInfo[x].OpenDescription,
                            CloseDesc: tradeInfo[x].CloseDescription,
                            OpenPrice: tradeInfo[x].OpenPrice,
                            ClosePrice: tradeInfo[x].ClosePrice,
                            OptionSet: tradeInfo[x].OptionSet,
                            GainLoss: tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice,
                            OptionSetTotal: getSetTotalsFunc(tradeInfo[x].ClosePrice, tradeInfo[x].OptionSet, tradeInfo[x].TradeID) + tradeInfo[x].OpenPrice,
                            TradeStatus: tradeInfo[x].Status,
                            TradeType: tradeInfo[x].TradeType,
                            CreditDebit: tradeInfo[x].CreditDebit,
                            SetupType: tradeInfo[x].SetupType,
                            Rec: tradeInfo[x].Rec,
                            Rating: tradeInfo[x].Rating

                }

                weekBuildArr.push(trade);

                week = getWeekFunc(tradeInfo[x].CloseDate);
                
                if (week === undefined && tradeInfo[x].CloseDate !== null) {
                    currentWeekArr.push(getWeekFunc(tradeInfo[x].CloseDate));
                    week = getWeekFunc(tradeInfo[x].CloseDate);
                }
                if (currentWeekArr.indexOf(week) < 0 && tradeInfo[x].CloseDate !== null) {
                    currentWeekArr.push(getWeekFunc(tradeInfo[x].CloseDate));
                }       
            }
            
            
            var getPercentageFunc = function(x, openPrice, status, optionSetTotal) {
                var getPercentage = 0;
                     
                    if (status === 'Closed' && !optionSetTotal) {
                        getPercentage = weekBuildArr[x].GainLoss / Math.abs(openPrice) * 100;
                        weekBuildArr[x].PercentageGainLost = Math.round(getPercentage);
                        getPercentage = 0;
                    }
                    if (status === 'Closed' && optionSetTotal) {
                        getPercentage = weekBuildArr[x].OptionSetTotal / Math.abs(openPrice) * 100;
                        weekBuildArr[x].PercentageGainLost = Math.round(getPercentage);
                        getPercentage = 0;
                    }
            }

           
            for (var x in tradeInfo) {
                weekBuilderFunc(x);
            }

            for (var x in weekBuildArr) {
                getPercentageFunc(x, weekBuildArr[x].OpenPrice, weekBuildArr[x].TradeStatus, weekBuildArr[x].OptionSetTotal);
            }




            var winLossPercentage = 0;
            var counter = 0;
            var usedRatioArr = [];
            var totalWins = 0;
            var totalLosses = 0;
            
            var getWinLossRatioFunc = function(win, loss, category, fooValue) {
                var wins = 0;
                var losses = 0;
                var something = category;
            
                for (var x in weekBuildArr) {

                    if (weekBuildArr[x].PercentageGainLost >= 0 && weekBuildArr[x].TradeStatus === 'Closed' && weekBuildArr[x].OptionSet === undefined && weekBuildArr[x][category] === fooValue) {
                        wins++;                        
                    }
                    if (weekBuildArr[x].PercentageGainLost < 0 && weekBuildArr[x].TradeStatus === 'Closed' && weekBuildArr[x].OptionSet === undefined && weekBuildArr[x][category] === fooValue) {
                        losses++;
                        counter++;
                        // console.log(weekBuildArr[x].TableId + " " + weekBuildArr[x].Ticker + " " + counter);
                    }
                    if (weekBuildArr[x].OptionSet !== undefined && weekBuildArr[x][category] === fooValue) {
                        var ratioArr = [];
                        var value;
                        for (var i in weekBuildArr) {
                            if (weekBuildArr[i].TradeId === weekBuildArr[x].TradeId) {
                                value = {
                                            TradeId: weekBuildArr[i].TradeId,
                                            Per: weekBuildArr[i].PercentageGainLost,
                                            TableId: weekBuildArr[i].TableId
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
                                counter++;
                                // console.log(ratioArr[e].TableId + " " + counter + " THESE ARE FROM THE SETS!!!!");
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

   
           
            var currentWeekTotalsArr = [];
            var overallTotal = 0;
            var weekTotalsBuilder = function() {
                var weekTotal = 0;
                var openTradesTotal = 0;
                var week;
                var openCredit = 0;
                var openDebit = 0;
                var openTotal = 0;
                var closedCredit = 0;
                var closedDebit = 0;
                var avgPercentage = 0;
                var counter = 0;
                var month;
                var wins = 0;
                var losses = 0; 
                var winLossUsedArr =[];         

                for (var x = 0; x < currentWeekArr.length; x++) {
                    for (var i in weekBuildArr) {
                        if (currentWeekArr[x] === weekBuildArr[i].Week && weekBuildArr[i].OptionSet === undefined && weekBuildArr[i].TradeStatus === 'Closed') {
                            weekTotal += weekBuildArr[i].GainLoss;
                            openTotal += Math.abs(weekBuildArr[i].OpenPrice);
                            avgPercentage += weekBuildArr[i].PercentageGainLost;
                            counter++;
                        }
                        if (currentWeekArr[x] === weekBuildArr[i].Week && weekBuildArr[i].OptionSet < 2) {
                            weekTotal += weekBuildArr[i].GainLoss;
                        }
                        if (currentWeekArr[x] === weekBuildArr[i].Week && weekBuildArr[i].OptionSet > 1) {
                            weekTotal += weekBuildArr[i].ClosePrice;
                        }
                        if (weekBuildArr[i].TradeStatus === 'Open') {
                            openTradesTotal += weekBuildArr[i].OpenPrice;
                        }
                        if (weekBuildArr[i].CreditDebit === 'Credit' && weekBuildArr[i].TradeStatus === 'Open') {
                            openCredit += weekBuildArr[i].OpenPrice;
                        }
                        if (weekBuildArr[i].CreditDebit === 'Debit' && weekBuildArr[i].TradeStatus === 'Open') {
                            openDebit += weekBuildArr[i].OpenPrice;
                        }
                        if (weekBuildArr[i].CreditDebit === 'Credit' && weekBuildArr[i].TradeStatus === 'Closed' && currentWeekArr[x] === weekBuildArr[i].Week) {
                            closedCredit += weekBuildArr[i].OpenPrice;
                        }
                        if (weekBuildArr[i].CreditDebit === 'Debit' && weekBuildArr[i].TradeStatus === 'Closed' && currentWeekArr[x] === weekBuildArr[i].Week) {
                            closedDebit += weekBuildArr[i].OpenPrice;
                        }
                        if (currentWeekArr[x] === weekBuildArr[i].Week && winLossUsedArr.indexOf(weekBuildArr[i].Week) === -1) {
                            month = weekBuildArr[i].Month;
                            wins += getWinLossRatioFunc(true, false, 'Week', weekBuildArr[i].Week);
                            losses += getWinLossRatioFunc(false, true, 'Week', weekBuildArr[i].Week);
                            winLossUsedArr.push(weekBuildArr[i].Week);
                        }
                    }

                    overallTotal += weekTotal;

                    week = {
                        Week: currentWeekArr[x],
                        Month: month,
                        WeekTotal: weekTotal,
                        OpenTradesTotal: openTradesTotal,
                        OpenCredit: openCredit,
                        OpenDebit: openDebit,
                        ClosedCredit: closedCredit,
                        ClosedDebit: closedDebit,
                        WeekPercentage: Math.round(weekTotal / openTotal * 100),
                        AvgPercentage: Math.round(avgPercentage / counter),
                        Wins: wins,
                        Losses: losses,
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
                    };
                    currentWeekTotalsArr.push(week);
                    weekTotal = 0;
                    openTradesTotal = 0;
                    openCredit = 0;
                    openDebit = 0;
                    openTotal = 0;
                    closedCredit = 0;
                    closedDebit = 0;
                    avgPercentage = 0;
                    counter = 0;
                    month = "";
                    wins = 0;
                    losses = 0;
                }
            }

            weekTotalsBuilder();


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };





            console.log(tradeInfo);
            // console.log(weekBuildArr);
            // console.log(currentWeekTotalsArr);
            res.render('trades_by_week', { TimeCreate: dateTime, Weeks: currentWeekTotalsArr, Trades: weekBuildArr, Totals: totals });
            
        });        

    };
    

    //============================================================================================================================================
    //======================================================= BY CATEGORY ========================================================================
    //============================================================================================================================================

    var getTradesByCategory = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];

                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'SetupType');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('SetupType');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            // console.log(weekBuildArr);
            // console.log(currentWeekTotalsArr);
            res.render('trades_by_category', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };


    //============================================================================================================================================
    //======================================================= BY Trade Type ========================================================================
    //============================================================================================================================================

    // var getTradesByTradeType = function(req, res) { 

    //     pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
    //         if (err) {
    //             console.log(err);
    //         };

    //         tradeInfo = rows; 

            
    //         //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
    //         //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
    //         //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

    //         var setOptionNumsFunc = function(value) {
    //             var counter = 0;
    //             var idArr = [];

    //             if (value === null) {
    //                 return;
    //             }
    //             for (var i = 0; i < tradeInfo.length; i++) {
    //                 if (tradeInfo[i].TradeID === value) {
    //                     counter++;
    //                     idArr.push(tradeInfo[i].ID);
    //                 }                      
    //             }
    //             if (idArr.length > 1) {
    //                 var e = 0;
    //                 for (var x = 0; x < tradeInfo.length; x++) {
    //                     for (e = 0; e < idArr.length; e++) {
    //                         if (tradeInfo[x].ID === idArr[e]) {
    //                             tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
    //                         }
    //                     }  
    //                 }
                       
    //             }
    //         }

            
    //         var getWeekFunc = function(x, week, month) {
    //             if (week) {
    //                 tradeInfo[x].Week = dateFormat(week, "W")
    //             }
    //             if (month) {
    //                 tradeInfo[x].Month = dateFormat(month, "mmmm")
    //             }
    //         }

            
    //         //=== SetTotals Function will take the price, OptionSet number, tradeID and add its price to the trade that is directly below it in OptionSet number. Example
    //         //if there is 3 options a part of the set then if the 3rd trade is passed it in will take its current close price and add it to all trades below it so trade 
    //         //OptionSet #2 then #1. The reason for this is when options are scaled out of then the options are sold individually and to show how much was made on the trade
    //         //you need to take lets say 2 option close price and add it to the 1st option close price then subtract it to the open price of the original trade so you know
    //         //how much was made on the total trade. You can't just take the close price of each scaled out of options and subtract them each from sale price of the OG trade.
    //         //Example is if you buy 3 options for a total of $300 and sell the first one for $100 minus $300 then you are still $200 in the whole and you sell the 2nd one for
    //         //$200 now you are even and the 3rd now all profit. So adding the 2nd and 1st option close price together lets you know where you are at in the OG trade.
            
    //         var getSetTotalsFunc = function(price, optionSetNum, closeTradeId) {
                
    //             if (optionSetNum > 1) {
    //                 var optionPriceTotal = 0;
    //                 for (var e = optionSetNum; e >= optionSetNum; e--) {
    //                     for (var i = 0; i < tradeInfo.length; i++) {
    //                         if (tradeInfo[i].TradeID === closeTradeId && tradeInfo[i].OptionSet === (optionSetNum - 1)) {
    //                             optionSetNum--;
    //                             optionPriceTotal += tradeInfo[i].ClosePrice;                                
    //                         }
    //                     }                        
    //                 }
    //                 return optionPriceTotal + price;
    //             }
    //         }


    //         var tradeStatus = function(x) {
    //             if (tradeInfo[x].CloseDate === null) {
    //                 tradeInfo[x].TradeStatus = "Open";
    //             }
    //             if (tradeInfo[x].CloseDate !== null) {
    //                 tradeInfo[x].TradeStatus = "Closed";
    //             }              
    //         }
            
            
    //         var getPercentageFunc = function(x, openPrice, status, optionSetTotal) {
    //             var getPercentage = 0;
                     
    //                 if (status === 'Closed' && !optionSetTotal) {
    //                     getPercentage = tradeInfo[x].GainLoss / Math.abs(openPrice) * 100;
    //                     tradeInfo[x].PercentageGainLost = Math.round(getPercentage);
    //                     getPercentage = 0;
    //                 }
    //                 if (status === 'Closed' && optionSetTotal) {
    //                     getPercentage = tradeInfo[x].OptionSetTotal / Math.abs(openPrice) * 100;
    //                     tradeInfo[x].PercentageGainLost = Math.round(getPercentage);
    //                     getPercentage = 0;
    //                 }
    //         }


    //         var winLossPercentage = 0;
    //         var usedRatioArr = [];
    //         var totalWins = 0;
    //         var totalLosses = 0;
    //         var getWinLossRatioFunc = function(win, loss, category, fooValue) {
    //             var wins = 0;
    //             var losses = 0;
            
    //             for (var x in tradeInfo) {

    //                 if (tradeInfo[x].PercentageGainLost >= 0 && tradeInfo[x].TradeStatus === 'Closed' && tradeInfo[x].OptionSet === undefined && tradeInfo[x][category] === fooValue) {
    //                     wins++;                        
    //                 }
    //                 if (tradeInfo[x].PercentageGainLost < 0 && tradeInfo[x].TradeStatus === 'Closed' && tradeInfo[x].OptionSet === undefined && tradeInfo[x][category] === fooValue) {
    //                     losses++;
    //                 }
    //                 if (tradeInfo[x].OptionSet !== undefined && tradeInfo[x][category] === fooValue) {
    //                     var ratioArr = [];
    //                     var value;
    //                     for (var i in tradeInfo) {
    //                         if (tradeInfo[i].TradeID === tradeInfo[x].TradeID) {
    //                             value = {
    //                                         TradeId: tradeInfo[i].TradeID,
    //                                         Per: tradeInfo[i].PercentageGainLost,
    //                                         TableId: tradeInfo[i].ID
    //                                     }
    //                             ratioArr.push(value);                                
    //                         }
    //                     }
    //                     for (var e = 0; e < ratioArr.length; e++) {
    //                         if (ratioArr[e].Per >= 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1) {
    //                             wins++;
    //                             usedRatioArr.push(ratioArr[e].TradeId);
    //                             break;
    //                         }
    //                         if (ratioArr[e].Per < 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1 && e + 1 === ratioArr.length) {
    //                             losses++;
    //                             usedRatioArr.push(ratioArr[e].TradeId);
    //                         }
    //                     }
    
    //                 } 
    //             }
    //             if (win) {
    //                 totalWins += wins;
    //                 return wins;
    //             }
    //             if (loss) {
    //                 totalLosses += losses;
    //                 return losses;
    //             }
    //         };

            
            
    //         var currentCatArr = [];
    //         var catBuildArr = [];
    //         var cat;
    //         var catBuilderFunc = function(x, category) {

    //             setOptionNumsFunc(tradeInfo[x].TradeID);
    //             tradeStatus(x);
    //             getWeekFunc(x, tradeInfo[x].CloseDate);
    //             getWeekFunc(x, false, tradeInfo[x].CloseDate);
    //             tradeInfo[x].OptionSetTotal = getSetTotalsFunc(tradeInfo[x].ClosePrice, tradeInfo[x].OptionSet, tradeInfo[x].TradeID) + tradeInfo[x].OpenPrice;
    //             tradeInfo[x].GainLoss = tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice;
    //             getPercentageFunc(x, tradeInfo[x].OpenPrice, tradeInfo[x].TradeStatus, tradeInfo[x].OptionSetTotal);
                
    //             cat = tradeInfo[x][category];
                
    //             if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
    //                 currentCatArr.push(tradeInfo[x][category]);
    //             }       
    //         }
            
                
            
    //         for (var x in tradeInfo) {
    //             catBuilderFunc(x, 'TradeType');
    //         }



    //         var currentCatTotalsArr = [];
    //         var overallTotal = 0;
    //         var catTotalsBuilder = function(category) {
    //             var catTotal = 0;
    //             var openTradesTotal = 0;
    //             var cat;
    //             var credit = 0;
    //             var debit = 0;
    //             var openTotal = 0;
    //             var avgPercentage = 0;
    //             var counter = 0;
    //             var month;
    //             var wins = 0;
    //             var losses = 0; 
    //             var winLossUsedArr =[];         

    //             for (var x = 0; x < currentCatArr.length; x++) {
    //                 for (var i in tradeInfo) {
    //                     if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet === undefined && tradeInfo[i].TradeStatus === 'Closed') {
    //                         catTotal += tradeInfo[i].GainLoss;
    //                         openTotal += Math.abs(tradeInfo[i].OpenPrice);
    //                         avgPercentage += tradeInfo[i].PercentageGainLost;
    //                         counter++;
    //                     }
    //                     if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet < 2) {
    //                         catTotal += tradeInfo[i].GainLoss;
    //                     }
    //                     if (currentCatArr[x] === tradeInfo[i][category] && tradeInfo[i].OptionSet > 1) {
    //                         catTotal += tradeInfo[i].ClosePrice;
    //                     }
    //                     if (tradeInfo[i].TradeStatus === 'Open') {
    //                         openTradesTotal += tradeInfo[i].OpenPrice;
    //                     }
    //                     if (tradeInfo[i].CreditDebit === 'Credit' && tradeInfo[i].TradeStatus === 'Open') {
    //                         credit += tradeInfo[i].OpenPrice;
    //                     }
    //                     if (tradeInfo[i].CreditDebit === 'Debit' && tradeInfo[i].TradeStatus === 'Open') {
    //                         debit += tradeInfo[i].OpenPrice;
    //                     }
    //                     if (currentCatArr[x] === tradeInfo[i][category] && winLossUsedArr.indexOf(tradeInfo[i][category]) === -1) {
    //                         month = tradeInfo[i].Month;
    //                         wins += getWinLossRatioFunc(true, false, category, tradeInfo[i][category]);
    //                         losses += getWinLossRatioFunc(false, true, category, tradeInfo[i][category]);
    //                         winLossUsedArr.push(tradeInfo[i][category]);
    //                     }
    //                 }

    //                 overallTotal += catTotal;

    //                 cat = {
    //                     Cat: currentCatArr[x],
    //                     Month: month,
    //                     CatTotal: catTotal,
    //                     OpenTradesTotal: openTradesTotal,
    //                     Credit: credit,
    //                     Debit: debit,
    //                     catPercentage: Math.round(catTotal / openTotal * 100),
    //                     AvgPercentage: Math.round(avgPercentage / counter),
    //                     Wins: wins,
    //                     Losses: losses,
    //                     WinLossPercent: Math.round(wins / (wins + losses) * 100)
    //                 };
    //                 currentCatTotalsArr.push(cat);
    //                 catTotal = 0;
    //                 openTradesTotal = 0;
    //                 credit = 0;
    //                 debit = 0;
    //                 openTotal = 0;
    //                 avgPercentage = 0;
    //                 counter = 0;
    //                 month = "";
    //                 wins = 0;
    //                 losses = 0;
    //             }
    //         }

    //         catTotalsBuilder('TradeType');


    //         var totals = {
    //             OverallTotal: overallTotal + 107977,
    //             TotalWins: totalWins,
    //             TotalLosses: totalLosses,
    //             WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
    //         };

            
    //         // console.log(weekBuildArr);
    //         // console.log(currentWeekTotalsArr);
    //         res.render('trades_by_tradetype', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
    //     });        

    // };



    //============================================================================================================================================
    //======================================================= BY REC ========================================================================
    //============================================================================================================================================

    var getTradesByRec = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'Rec');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('Rec');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            // console.log(weekBuildArr);
            // console.log(currentWeekTotalsArr);
            res.render('trades_by_rec', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    //============================================================================================================================================
    //======================================================= BY CREDIT OR DEBIT ========================================================================
    //============================================================================================================================================

    var getTradesByCreditDebit = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'CreditDebit');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('CreditDebit');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            // console.log(weekBuildArr);
            // console.log(currentWeekTotalsArr);
            res.render('trades_by_creditdebit', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    //============================================================================================================================================
    //======================================================= BY RATING ========================================================================
    //============================================================================================================================================

    var getTradesByRating = function(req, res, stuff) { 

        stuff = 'Rating';

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, stuff);
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder(stuff);


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            // console.log(weekBuildArr);
            // console.log(currentWeekTotalsArr);
            res.render('trades_by_rating', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    //============================================================================================================================================
    //======================================================= BY MONTH ========================================================================
    //============================================================================================================================================

    var getTradesByMonth = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'Month');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('Month');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            res.render('trades_by_month', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    //============================================================================================================================================
    //======================================================= BY ID ========================================================================
    //============================================================================================================================================

    var getTradesById = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            
            //=== setOptionNumsFunc will take the TradeID value and match it with other tradeID's in the Object then push the Object's ID to an array.
            //Then next will loop through array of ID's and will return the position number in the trade. Example if 3 options were purchased within the same trade
            //then the options were sold individually setOptionNumsFunc function will mark them (OptionSet) in the order they were sold.

            var setOptionNumsFunc = function(value) {
                var counter = 0;
                var idArr = [];

                if (value === null) {
                    return;
                }
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }                      
                }
                if (idArr.length > 1) {
                    var e = 0;
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = idArr.indexOf(idArr[e]) + 1;
                            }
                        }  
                    }
                       
                }
            }

            
            var getWeekFunc = function(x, week, month) {
                if (week) {
                    tradeInfo[x].Week = dateFormat(week, "W")
                }
                if (month) {
                    tradeInfo[x].Month = dateFormat(month, "mmmm")
                }
            }

            
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
                
                cat = tradeInfo[x][category];
                
                if (currentCatArr.indexOf(cat) < 0 && tradeInfo[x].TradeStatus === 'Closed') {
                    currentCatArr.push(tradeInfo[x][category]);
                }       
            }
            
                
            
            for (var x in tradeInfo) {
                catBuilderFunc(x, 'TradeID');
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
                        WinLossPercent: Math.round(wins / (wins + losses) * 100)
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

            catTotalsBuilder('TradeID');


            var totals = {
                OverallTotal: overallTotal + 107977,
                TotalWins: totalWins,
                TotalLosses: totalLosses,
                WinLossPercent: Math.round(totalWins / (totalWins + totalLosses) * 100)
            };

            
            res.render('trades_by_id', { TimeCreate: dateTime, Category: currentCatTotalsArr, Trades: tradeInfo, Totals: totals });
            
        });        

    };



    
    //============================================================================================================================================
    //======================================================= New Query ==========================================================================
    //============================================================================================================================================

    var putToken = function(req, res) {
        
        let custName = req.body.name;
        let custigName = req.body.igName;
        let custId = req.params.id
        
        pool.query('UPDATE Customers SET Name = ? WHERE ID = ?', [custName, custId], function (err, rows, fields) {
            if (err) {
                console.log(err);
            };
    
            if(!req.body) {
                res.status(400).send('Bad Request');
            return;
            }
    
            pool.query('SELECT * FROM Customers', function(err, rows, fields) {
                if (err) {
                    console.log(err);
                };
        
                res.render('customers', { Customers: rows, TimeCreate: dateTime });    
            });
            
        }); 
};






    
    
    var getTradeAdd = function(req, res) {

        if(!req.body) {
            res.status(400).send('Bad Request');
        return;
        }

        res.render('trade_add');
        
    };

    router.route('/trades_by_week').get(getTradesByWeek);
    router.route('/trades_by_category').get(getTradesByCategory);
    // router.route('/trades_by_tradetype').get(getTradesByTradeType);
    router.route('/trades_by_rec').get(getTradesByRec);
    router.route('/trades_by_creditdebit').get(getTradesByCreditDebit);
    router.route('/trades_by_rating').get(getTradesByRating);
    router.route('/trades_by_month').get(getTradesByMonth);
    router.route('/trades_by_id').get(getTradesById);
    router.route('/trades_by_ticker').get(getTradesByTicker);
    router.route('/trade_add').get(getTradeAdd);
    router.route('/trade_add').put(getTradeAdd);
    return router;


};


// SELECT * FROM Options LEFT OUTER JOIN SoldOptions ON SoldOptions.OptionID = Options.ID



// SELECT COUNT(CustomerID), Country
// FROM Customers
// GROUP BY Country;


// SELECT column_name(s)
// FROM table_name
// WHERE condition
// GROUP BY column_name(s)
// ORDER BY column_name(s);

// 'SELECT * FROM CloseTrades JOIN OpenTrades ON CloseTrades.TradeID = OpenTrades.ID ORDER BY OpenTrades.ID'


// SELECT * FROM OpenTrades JOIN CloseTrades ON OpenTrades.ID = CloseTrades.TradeID


// SELECT OrderNumber, TotalAmount, FirstName, LastName, City, Country
//   FROM [Order] JOIN Customer
//     ON [Order].CustomerId = Customer.Id

// SELECT column-names
// FROM table-name1 FULL OUTER JOIN table-name2 
//   ON column-name1 = column-name2
// WHERE condition

// SELECT C.FirstName, C.LastName, C.Country AS CustomerCountry, 
//        S.Country AS SupplierCountry, S.CompanyName
//   FROM Customer C FULL JOIN Supplier S 
//     ON C.Country = S.Country
//  ORDER BY C.Country, S.Country



// var getTradesList = function(req, res) { 
//     var tickers;
//     var tradeInfo;

//     pool.query('SELECT * FROM OpenTrades GROUP BY Ticker ORDER BY ID ASC', function(err, rows, fields) {
//         if (err) {
//             console.log(err);
//         };

//         res.render('trades', { Trades: rows, TimeCreate: dateTime });

//         console.log(rows);

//     });
// };



// ---- Sorting Notes

            // for ( x = 0; x < company.length; x++) {   
            //     if (company[x].Ticker === tradeInfo[x].Ticker) {
            //         for (i = 0; i < tradeInfo.length; i++) {
            //             totals.totalPrice = tradeInfo[i].ClosePrice + tradeInfo[i].OpenPrice;
            //         }
            //     }    
            // }
            
                    // totals = {
                    //             totalPrice: 'foo1',
                    //             totalTicker: 'bar1',
                    //         };
                    // totalsArr.push(totals);
                    // totals = {
                    //             totalPrice: 'foo2',
                    //             totalTicker: 'bar2',
                    //         };
                    // totalsArr.push(totals);

            // var x;
            // var totalsFoReal = 0;
            // var calls = 0;
            // for (x in tradeInfo) {
            //     for (var i = 1; i < tradeInfo.length; i++) {
            //         if (tradeInfo[i].TradeID === tradeInfo[i+1].TradeID)
            //             calls += tradeInfo[i].ClosePrice;
            //             console.log(x + " x" + " / " + i + " i" + " " + tradeInfo[x].Ticker + " " + tradeInfo[i].Ticker + " " + calls);
            //     }
            //     if (tradeInfo[x].ClosePrice !== null) {
            //         totalsFoReal += tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice;
            //         totals = {
            //                     totalPrice: tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice,
            //                     totalTicker: tradeInfo[x].Ticker,
            //                     total: totalsFoReal
            //                 };
            //         totalsArr.push(totals);
            //     }
            // }


            // var x;
            // var totalsFoReal = 0;
            // for (x in tradeInfo) {
            //     if (tradeInfo[x].ClosePrice !== null) {
            //         totalsFoReal += tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice;
            //         totals = {
            //                     totalPrice: tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice,
            //                     totalTicker: tradeInfo[x].Ticker,
            //                     total: totalsFoReal
            //                 };
            //         totalsArr.push(totals);
            //     }
            // }
                    


            // var x;
            // var totalsFoReal = 0;
            // for (x in tradeInfo) {
            //     if (tradeInfo[x].Ticker === company[x].Ticker) {
            //         totalsFoReal += tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice;
            //         totals = {
            //                     totalPrice: tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice,
            //                     totalTicker: tradeInfo[x].Ticker,
            //                     total: totalsFoReal
            //                 };
            //         totalsArr.push(totals);
            //     }
            // }




            // var weekTotal = 0;
            // var getTotalsFunc = function(price, week, status) {
            //     var getWeek;
                
            //         if (status === 'Closed') {
            //             if (getWeek !== week) {
            //                 weekTotal = 0;
            //                 getWeek = undefined;
            //                 // console.log("if 1 " + price + " " + getWeek);
            //             }
            //             if (getWeek === undefined) {
            //                 getWeek = week;
            //                 // console.log("if 2 " + price + " " + getWeek);
            //             }    
            //             if (week === getWeek) {
            //                 weekTotal = (price + weekTotal);
            //                 getWeek = week;
            //                 // console.log("if 3 " + price + " " + getWeek);
            //                 // console.log("if 3 total " + weekTotal);

            //                 return weekTotal;
            //             }
            //         }
            // }


    //         trade = {
    //             Week: getWeekFunc(tradeInfo[x].CloseDate),
    //             Ticker: tradeInfo[x].Ticker,
    //             TradeId: tradeInfo[x].TradeID,
    //             OpenDate: tradeInfo[x].OpenDate,
    //             CloseDate: tradeInfo[x].CloseDate,
    //             OpenDesc: tradeInfo[x].OpenDescription,
    //             CloseDesc: tradeInfo[x].CloseDescription,
    //             OpenPrice: tradeInfo[x].OpenPrice,
    //             ClosePrice: tradeInfo[x].ClosePrice,
    //             OptionSet: tradeInfo[x].OptionSet,
    //             GainLoss: getTotalsFunc(tradeInfo[x].ClosePrice + tradeInfo[x].OpenPrice, getWeekFunc(tradeInfo[x].CloseDate), tradeInfo[x].Status),
    //             OptionSetTotal: getSetTotalsFunc(tradeInfo[x].ClosePrice, tradeInfo[x].OptionSet, tradeInfo[x].TradeID) + tradeInfo[x].OpenPrice,
    //             TradeStatus: tradeInfo[x].Status,
    //             TradeType: tradeInfo[x].TradeType,
    //             CreditDebit: tradeInfo[x].CreditDebit,
    //             PercentageGainLost: trade

    // }



    // for (var i in weekBuildArr) {
                        
    //     if (weekBuildArr[i].TradeId === weekBuildArr[x].TradeId) {
    //         if (arr.length === 0) {
    //             arr.push(weekBuildArr[i].TradeId);
    //         }
    //         for (var e = 0; e < arr.length; e++) {
    //             if (arr[e] === weekBuildArr[i].TradeId) {
    //                 break;
    //             } else {
    //                 arr.push(weekBuildArr[i].TradeId);
    //             }
    //         }
    //     }
    // }


    // for (var i in weekBuildArr) {
    //     if (weekBuildArr[i].TradeId === weekBuildArr[x].TradeId) {
    //         if (ratioArr.length === 0) {
    //             ratioArr.push(weekBuildArr[i].TradeId);
    //         }
    //         if (ratioArr.indexOf(weekBuildArr[i].TradeId) === -1) {
    //             ratioArr.push(weekBuildArr[i].TradeId);
    //         }
    //     }
    // }



            // var wins = 0;
            // var losses = 0;
            // var winLossPercentage = 0;
            // var counter = 0;
            // var usedRatioArr = [];
            
            // for (var x in weekBuildArr) {

            //     if (weekBuildArr[x].PercentageGainLost >= 0 && weekBuildArr[x].TradeStatus === 'Closed' && weekBuildArr[x].OptionSet === undefined) {
            //         wins++;
                    
            //     }
            //     if (weekBuildArr[x].PercentageGainLost < 0 && weekBuildArr[x].TradeStatus === 'Closed' && weekBuildArr[x].OptionSet === undefined) {
            //         losses++;
            //         counter++;
            //         console.log(weekBuildArr[x].TableId + " " + weekBuildArr[x].Ticker + " " + counter);
            //     }
            //     if (weekBuildArr[x].OptionSet !== undefined) {
            //         var ratioArr = [];
            //         var value;
            //         for (var i in weekBuildArr) {
            //             if (weekBuildArr[i].TradeId === weekBuildArr[x].TradeId) {

            //                 value = {
            //                             TradeId: weekBuildArr[i].TradeId,
            //                             Per: weekBuildArr[i].PercentageGainLost,
            //                             TableId: weekBuildArr[i].TableId
            //                         }
            //                 ratioArr.push(value);

                            
            //             }
            //         }
            //         for (var e = 0; e < ratioArr.length; e++) {
            //             if (ratioArr[e].Per >= 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1) {
            //                 wins++;
            //                 usedRatioArr.push(ratioArr[e].TradeId);
            //                 break;
            //             }
            //             if (ratioArr[e].Per < 0 && usedRatioArr.indexOf(ratioArr[e].TradeId) === -1 && e + 1 === ratioArr.length) {
            //                 losses++;
            //                 usedRatioArr.push(ratioArr[e].TradeId);
            //                 counter++;
            //                 console.log(ratioArr[e].TableId + " " + counter + " THESE ARE FROM THE SETS!!!!");
            //             }
            //         }
 
            //     }    
            // }

            // console.log(ratioArr);

            // var totals = {
            //                 OverallTotal: overallTotal + 107977,
            //                 TotalWins: wins,
            //                 TotalLosses: losses,
            //                 WinLossPercent: Math.round(wins / (wins + losses) * 100)
            //             };