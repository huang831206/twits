var axios = require('axios');
var moment = require('moment');
var log = require('./log.js');
var fs = require('fs');
var mysql = require('mysql');
var mysql_conn;

var batch = 90;     // will sleep 1 hour after batch size, because server limit is 200 req/hr

try {
    var config = require('./config.json');
} catch (e) {
    log('fatal', 'Failed to load config.');
}

try {
    var symbols = require('./symbols.json');
    if(!Array.isArray(symbols)){
        throw 'e';
    }
} catch (e) {
    log('fatal', 'Failed to load symbols.')
}

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

function save(isError, symbol, data, table, onSuccess) {
    var sql = 'INSERT INTO ' + table + ' SET ?';
    mysql_conn.query(sql,
        {
            symbol: symbol,
            content : data,
            is_error : isError,
            timestamp : moment().format('YYYY-MM-DD hh:mm:ss')
        }, function(err, result) {
            if (err) {
                log('error', 'Uable to insert into database.\n' + err);
            } else {
                if (onSuccess instanceof Function) {
                    onSuccess();
                }
            }
    });
}


// return random seconds between min and max in milliseconds
// [min, max)
var getRandMilSec = (min, max) => Math.floor((Math.random() * (max - min + 1) + min) * 1000);

var sentimentURLOf = (symbol) => 'https://api.stocktwits.com/api/2/symbols/' + symbol + '/sentiment.json';
var volumeURLOf = (symbol) => 'https://api.stocktwits.com/api/2/symbols/' + symbol + '/volume.json';

function getDataOfSymbol(symbol) {
    log('info', '[' + symbol + '] Collecting data: ' + moment().format('YYYY-MM-DD hh:mm:ss'));
    getData(sentimentURLOf, symbol, config.data_table.sentiment);    // sentiment data
    getData(volumeURLOf, symbol, config.data_table.volume);       // volume data
}

function getData(urlOf, symbol, table) {
    // async retrieve data from url
    axios.get( urlOf(symbol) )
        .then( response => {
            if(response.status == 200){
                let data = response.data;

                if (data.response.status == 200) {
                    // save result
                    save(false, symbol, JSON.stringify(data.data), table, () => {
                        log('success', urlOf.name.slice(0, -5) + ' data saved!');
                    });
                } else {
                    // save error
                    log('error', 'Server responsed without 200');
                    save(true, symbol, JSON.stringify(data), table, () => {
                        log('error', 'Error message stored.');
                    });
                }
            } else {
                log('error', 'Server didn\'t come back with 200');
                save(true, symbol, JSON.stringify(data), table, () => {
                    log('error', 'Error message stored.');
                });
            }
        })
        .catch( error => {
            log('error', 'Cannot GET data.');
            let errorMsg = '';

            // The request was made and the server responded with a status code
            if (error.response) {
                // retrieved data from server, but the symbol was not found.
                if (error.response.status == 404) {
                    errorMsg = JSON.stringify(error.response.data.errors);
                    log('error', 'Symbol not found: ' + symbol);
                } else {
                    errorMsg = JSON.stringify(error.response.data);
                }
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMsg = JSON.stringify(error.message);
                log('error', errorMsg);
            }

            save(true, symbol, errorMsg, table, ()=>{
                log('error', 'Error message stored.');
            });
        });
}

// apply a delay(of milliseconds) in a promise chain
function sleep(time) {
    return new Promise(function (resolve) {
        let i = setTimeout(()=>{
            clearTimeout(i);
            resolve();
        }, time)
    });
}

function startChain() {
    return symbols.reduce( (pre, cur) => {
        return pre.then( () => {
            getDataOfSymbol(cur.symbol);
        }).then( async () => {
            // apply the delay
            await sleep(cur.interval);
        });
    }, new Promise( (resolve, reject) => {
        // starting
        log('start', 'Tasks started. Time: ' + moment().format('YYYY-MM-DD hh:mm:ss'));
        resolve();
    }));
}


new Promise( (resolve, reject) => {
    log('start', 'Preparing data...');

    // load and parse data from csv
    let Papa = require('papaparse');

    csvString = fs.readFileSync('./symbols.csv', 'utf8');
    parseResult = Papa.parse(csvString, {
        delimiter: ',',
        encoding: 'utf8'
    });
    data = parseResult.data.map( row => row[0] );
    if(!Array.isArray(data)){
        reject('Error occurred while parsing csv.');
    }
    resolve(data);
})
.then( (data) => {
    if(symbols.length){
        // if there's already something in symbols.json, they will be the tasks
        // do whatever you want to the predefined data
    } else {
        // if there's nothing in symbols.json, let the tasks be the data read from csv
        symbols = data;
    }
    log('info', 'There are total ' + symbols.length + ' tasks.');
    // prepare data and their intervals
    symbols = symbols.map( (symbol, index) => ({
        symbol : symbol,
        // the api rate limit is 200 reqs per hour
        interval :  (index+1) % batch == 0 ? 3600000 : getRandMilSec(config.random_min, config.random_max)
    }));
})
.then( () => {
    connectDB();
    // start crawling
    startChain()
        .then( () => {
            log('end', 'All tasks done. Time: ' + moment().format('YYYY-MM-DD hh:mm:ss'));
        })
        .catch( () => {
            log('error', 'There is something wrong in the chain.');
        });
})
.catch( (err)=>{
    log('error', err);
})
