var Crawler = require("crawler");
var moment = require('moment');
var log = require('./log.js');
var mysql = require('mysql');
var mysql_conn;
// var axios = require('axios');

//load config file at same dir, exit if fail
try {
    var config = require('./config.json');
} catch (e) {
    log('fatal', 'Failed to load config.');
}

var interval = config.interval;

// promise base method
// axios.get('https://api.stocktwits.com/api/2/streams/symbol/AAPL.json')
//     .then(function (response) {
//         console.log(response);
//     })
//     .catch(function (error) {
//         console.log(error);
//     });

// initial database connection pool
function connectDB() {
    log('info', 'Attempt to open connection....');
    try {
        mysql_conn = mysql.createPool(config.mysql);
        log('info', 'Database connected.');
    } catch (e) {
        log('fatal', 'Unable to connect to database.\n' + e);
    }
}

function releaseDB() {
    log('info', 'Attempt to close connection....');
    try {
        mysql_conn.getConnection(function(err, connection) {
            if (err) {
                log('error', err);
            }
            connection.release();
        });
        log('info', 'Database connection closed.');
    } catch (e) {
        log('fatal', 'Unable to close connection.\n' + e);
    }
}

function save(isError, data, onSuccess) {
    var sql = 'INSERT INTO ' + config.data_table.trending + ' SET ?';
    mysql_conn.query(sql,
        {
            content : data,
            is_error : isError,
            timestamp : moment().format('YYYY-MM-DD hh:mm:ss')
        }, function(err, result) {
            if (err) {
                log('error', 'Uable to insert into database.\n' + err);
            } else {
                log('info', 'Message inserted.');
                if (onSuccess instanceof Function) {
                    onSuccess();
                }
            }
    });
}

var url_trending = 'https://api.stocktwits.com/api/2/trending/symbols.json';

var crawl = new Crawler({
    maxConnections : 1,
    rateLimit: interval * 60 * 1000,
    jQuery: false,
    callback : (error, res, done)=> {
        crawl.queue(url_trending);
        if(error){
            log('error', 'Cannot GET API.');
            save(true, JSON.stringify(error), ()=>{
                log('end', 'Error message stored.');
                log('next', moment().add(interval, 'minutes').format('YYYY-MM-DD hh:mm:ss'));
            });
        }else{
            if(res.statusCode == 200){
                // parse response
                try {
                    var data = JSON.parse(res.body);
                } catch (e) {
                    log('error', 'Response parsing error.');
                    save(true, res.body, ()=>{
                        log('end', 'Error message stored.');
                        log('next', moment().add(interval, 'minutes').format('YYYY-MM-DD hh:mm:ss'));
                    });
                    return;
                }

                if (data.response.status == 200){
                    // save result
                    save(false, JSON.stringify(data.symbols), ()=>{
                        log('success', 'Data saved!');
                        log('end', 'Request finished!');
                        log('next', moment().add(interval, 'minutes').format('YYYY-MM-DD hh:mm:ss'));
                    });
                } else {
                    // save error
                    log('error', 'Server responsed without 200');
                    save(true, res.body, ()=>{
                        log('end', 'Error message stored.');
                        log('next', moment().add(interval, 'minutes').format('YYYY-MM-DD hh:mm:ss'));
                    });
                }
            } else {
                log('error', 'Server didn\'t come back with 200');
                save(true, res.body, ()=>{
                    log('end', 'Error message stored.');
                    log('next', moment().add(interval, 'minutes').format('YYYY-MM-DD hh:mm:ss'));
                });
            }
        }
        done();
    }
});

//start
connectDB();
log('start', 'Start trending crawler.');
crawl.queue(url_trending);
