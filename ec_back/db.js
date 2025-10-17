// db.js
const config = require('./config'); 
const mysql = require('mysql2');




const connection = mysql.createConnection(config);

module.exports = connection;
