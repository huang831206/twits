var mysql = require('mysql');

try {
    var config = require('./config.json');
} catch (e) {
    console.log('Failed to load config.');
}

try {
    config.mysql.multipleStatements = true;
    var mysql_conn = mysql.createPool(config.mysql);
} catch (e) {
    console.log(e);
    process.exit();
}

console.log('Strat!');

var sql = 'DROP TABLE IF EXISTS ' + config.data_table.trending + '; CREATE TABLE ' + config.data_table.trending + ' (id INT UNSIGNED NOT NULL AUTO_INCREMENT, content TEXT, is_error TINYINT(1), timestamp TIMESTAMP, PRIMARY KEY(id))';
mysql_conn.query(sql, function (err, results, fields) {
    if(err){
        console.log(err);
    } else {
        console.log(config.data_table.trending + 'created.');
    }
});

sql = 'DROP TABLE IF EXISTS ' + config.data_table.sentiment + ' ; CREATE TABLE ' + config.data_table.sentiment + ' (id INT UNSIGNED NOT NULL AUTO_INCREMENT, symbol VARCHAR(40), content TEXT, is_error TINYINT(1), timestamp TIMESTAMP, PRIMARY KEY(id))';
mysql_conn.query(sql, function (err, results, fields) {
    if(err){
        console.log(err);
    } else {
        console.log(config.data_table.sentiment + ' created.');
    }
});

sql = 'DROP TABLE IF EXISTS ' + config.data_table.volume + '; CREATE TABLE '+ config.data_table.volume + ' (id INT UNSIGNED NOT NULL AUTO_INCREMENT, symbol VARCHAR(40), content TEXT, is_error TINYINT(1), timestamp TIMESTAMP, PRIMARY KEY(id))';
mysql_conn.query(sql, function (err, results, fields) {
    if(err){
        console.log(err);
    } else {
        console.log(config.data_table.volume + ' created.');
    }
});
