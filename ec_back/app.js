var express = require('express');
var cors = require('cors'); //fetch
var db = require('./db');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require("bcrypt");   
const jwt = require("jsonwebtoken");
const { user } = require('./config');

var app = express();
app.use(express.json()); 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));


db.connect(err => {
  if (err) {
    console.error('MySQL接続エラー:', err);
    return;
  }
  console.log('MySQL接続成功');
});

//トップページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'ec2_practice.html'));
});  

//ユーザ登録
app.post('/api/register', async (req, res) => {
  const { username, password, user_type } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO shop_db.users (user_name, user_password,user_type) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, user_type], (err, result) => {
      if (err) {
        console.error('DBエラー:', err);
        return res.status(500).json({ error: 'DBエラー' });
      }
      res.status(201).json({ message: 'ユーザ登録成功' });
    });
  } catch (error) {
    console.error('エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});


//rogin用のAPI



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
