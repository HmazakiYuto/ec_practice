var express = require('express');
var cors = require('cors'); //fetch対策
var db = require('./db');
const mysql = require('mysql2');


var app = express();
app.use(express.json()); 
app.use(cors());



db.connect(err => {
  if (err) {
    console.error('MySQL接続エラー:', err);
    return;
  }
  console.log('MySQL接続成功');
});



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
