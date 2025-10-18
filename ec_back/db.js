// db.js
const config = require('./config'); //外部ファイルにパスわーどを
const mysql = require('mysql2');




const connection = mysql.createConnection(config);

module.exports = connection;
