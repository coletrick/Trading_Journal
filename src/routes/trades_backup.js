const pool = require('../db.connection.js');
const dateTime = require('node-datetime');
var dateFormat = require('dateformat');
var now = new Date();

module.exports = function(router) {
    var company;
    var tradeInfo;
    var soldInfo;
    var totals;
    var totalsArr = [];

    var getTradesByTicker = function(req, res) { 


        pool.query('SELECT * FROM OpenTrades GROUP BY Ticker ORDER BY OpenDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            company = rows; 

        });

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN CloseTrades ON CloseTrades.TradeID = OpenTrades.ID', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            var num = 0;
            var getTicker;
            var getTotalsFunc = function(price, ticker) {
                
                    if (getTicker !== ticker) {
                        num = 0;
                        getTicker = undefined;
                        // console.log("if 1 " + ticker + " " + getTicker + " " + num);
                    }
                    if (getTicker === undefined) {
                        getTicker = ticker;
                        // console.log("if 2 " + ticker + " " + getTicker + " " + num);
                    }    
                    if (ticker === getTicker) {
                        num = (price + num);
                        getTicker = ticker;
                        // console.log("if 3 " + ticker + " " + getTicker + " " + num);
                        return num;
                    }                    
            }

            res.render('trades_by_ticker', { TradesInfo: tradeInfo, Tickers: company, TimeCreate: dateTime, Prices: totalsArr, TotesFunc: getTotalsFunc });
            
        });        

    };

    var getTradesByWeek = function(req, res) { 


        pool.query('SELECT * FROM OpenTrades ORDER BY OpenDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            company = rows; 

        });

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN CloseTrades ON CloseTrades.TradeID = OpenTrades.ID', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            tradeInfo = rows; 

            var getWeek = function(week) {
                return dateFormat(week, "W")
            }

            var x;
            for (x in tradeInfo) {
                tradeInfo[x].Week = getWeek(tradeInfo[x].CloseDate);
                if (tradeInfo[x].CloseDate === null) {
                    tradeInfo[x].Status = "Open";
                }
            }

            var num = 0;
            var getWeek;
            var getTotalsFunc = function(price, week, setPrice) {
                
                    if (getWeek !== week) {
                        num = 0;
                        getWeek = undefined;
                    }
                    if (getWeek === undefined) {
                        getWeek = week;
                    }    
                    if (week === getWeek) {
                        num = (price + num);
                        getWeek = week;

                        return num;
                    }
                    if (setPrice)                    
            }

            var search = function(value) {
                var counter = 0;
                var idArr = [];
                for (var i = 0; i < tradeInfo.length; i++) {
                    if (tradeInfo[i].TradeID === value) {
                        counter++;
                        idArr.push(tradeInfo[i].ID);
                    }
                    // if (tradeInfo[i].TradeID === value && counter > 1) {    
                    //     tradeInfo[i].OptionSet = "Yes";
                    //     // console.log(counter + " " + tradeInfo[i].Ticker + " i " + i);
                    // }                           
                }
                if (idArr.length > 1) {
                    for (var x = 0; x < tradeInfo.length; x++) {
                        for (var e = 0; e < idArr.length; e++) {
                            if (tradeInfo[x].ID === idArr[e]) {
                                tradeInfo[x].OptionSet = e + 1;
                                console.log(tradeInfo[x])
                            }
                        }  
                    }    
                }
            }


            res.render('trades_by_week', { TradesInfo: tradeInfo, Tickers: company, TimeCreate: dateTime, TotesFunc: getTotalsFunc, Weeks: getWeek, SearchSets: search });
            
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
    router.route('/trades_by_ticker').get(getTradesByTicker);
    router.route('/trade_add').get(getTradeAdd);
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