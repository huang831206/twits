var chalk = require('chalk');

var style = {
    section : chalk.blue.bold.bgWhiteBright,
    success : chalk.white.bgGreen,
    info : chalk.white,
    error : chalk.red,
    fatal : chalk.black.bgRed
};

module.exports = function (level, content) {
    switch (level) {
        case 'start':
            console.log(style.section('\n-------- [Start] ' + content + ' --------'));
            break;
        case 'end':
            console.log(style.section('-------- [Done] ' + content + ' --------'));
            break;
        case 'next':
            console.log(style.section('-------- [Next tick] ' + content + ' --------\n'));
            break;
        case 'success':
            console.log(style.success('[Success]') + ' ' + chalk.green(content));
            break;
        case 'info':
            console.log(style.info('[Info] ' + content));
            break;
        case 'error':
            console.log(style.info('[Error] ' + content));
            break;
        case 'fatal':
            console.log(style.fatal('[Fatal]') + ' ' + chalk.red(content));
            process.exit();
            break;
        default:
            console.log('An unexpected log occurred.')
    }
}
