module.exports = (function() {

    var mysql = require('mysql');
    var pool = mysql.createPool({
        connectionLimit: 10,
        host    : 'localhost',
        port    : '8889',
        user    : '',
        password : '',
        database : 'trading'
    });

    return pool;
})();
