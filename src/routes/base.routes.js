const pool = require('../db.connection.js');
const dateTime = require('node-datetime');

module.exports = function(router) {

    var getIndex = function(req, res) { 

        pool.query('SELECT * FROM OpenTrades LEFT OUTER JOIN ClosedTrades ON ClosedTrades.TradeID = OpenTrades.ID ORDER BY CloseDate ASC', function(err, rows, fields) {
            if (err) {
                console.log(err);
            };

            res.render('index', { Trades: rows, TimeCreate: dateTime });

            // console.log(rows);

        });
    };

    router.route('/').get(getIndex);
    // router.route('/products').post(postProducts);

    return router;


};