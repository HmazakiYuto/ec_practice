var express = require('express');
var cors = require('cors'); //fetch
var db = require('./db');
const mysql = require('mysql2');
const path = require('path');


var app = express();
app.use(express.json()); 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug');
app.set('views', './views');

db.connect(err => {
  if (err) {
    console.error('MySQL接続エラー:', err);
    return;
  }
  console.log('MySQL接続成功');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'ec2_practice.html'));
});  




//homepage用のAPI
app.get('/api/allitems', (req, res) => {
  const sql = 'SELECT item_id, item_name, item_price, item_category ,item_stock FROM shop_db.items';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('DBエラー:', err);
      res.status(500).json({ error: 'DBエラー' });
    } else {
      console.log('取得結果:', results);
      res.json(results);
    }
  });
});


app.listen(3001, () => console.log('Server running on port 3001'));

module.exports = app;
