install guide
1. create database and user in mysql.
2. install node (devloping env: node 8.5.0, npm 5.5.1)
3. setup config.json
    1. interval: interval in minutes that trending-crawler uses between two requests
    2. mysql: Mysql host, username, password, database
    3. data_table: table names you want to use
    4. random_min, random_max: min and max seconds that sentiment-volume-crawler uses to generate a random delay
4. npm install
5. node setup.js (will erase tables if same names exist)

run trending crawler:
1. node trending-crawler.js

run sentiment and volume crawler:
1. setup symbols.csv or symbols.json
    1. IMPORTANT: inserting any data to symbols.json will cause the crawler to use it.(ignoring csv data)
    2. using symbols.csv
        1. each symbol(as only item) in a new line
    3. using symbols.json
        1. each symbol as an array item
        2. it's recommended, as it can be generated from other programs
2. node sentiment-volume-crawler.js
