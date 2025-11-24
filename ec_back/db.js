// db.js
const config = require('./config'); //外部ファイルにパスわーどを
const mysql = require('mysql2');


//render公開用
const connection = mysql.createConnection({
  host: 'host',
  user: 'user',
  password: 'password',
  database: 'database'
});


//const connection = mysql.createConnection(config);

module.exports = connection;
