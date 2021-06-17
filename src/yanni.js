



var getClosedTrade(req, res) {
    getAccessToken(function(err, token) {
        if(err) {
            res.err(send errom messag bcck)
            return;
        }
        var option {
            url: "ww.examplcom",
            access_token:  token
        }
        request(options), function(err, result) {
            if(err) {
                res.err(send errom messag bcck)
                return;
            }
            var mydata = {
                myid: result.id,
                trasactiondate: result.transactiondate
            }
            res.render(foo, mydata)
        });
    });
    
}
function getAccessToken(callback) {
    var token = GetTokenFromDatabase();
    if(notExpiringsoon(token)) {
        callback(null, token);
        return;
    }
    requst(refrsehsoken), function(err, result) {
        if(err) {
            callback(err);
            return;
        }
        some method to save new token to databse()
        callback(err, result);
    } );
}
function istokenepiringooon(toke) {
    return false;
}