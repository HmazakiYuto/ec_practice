// ====== app.js ======
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require('./db'); // MySQL接続用
const { user } = require('./config'); // もし必要な設定あれば
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- MySQL接続 ---
db.connect(err => {
  if (err) {
    console.error('MySQL接続エラー:', err);
    return;
  }
  console.log('MySQL接続成功');
});

// ===== トップページ =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'ec2_practice.html'));
});

// ===== ユーザー登録 =====
app.post('/api/register', async (req, res) => {
  const { username, password, user_type } = req.body;

  if (!username || !password || !user_type) {
    return res.status(400).json({ error: 'username, password, user_type は必須です' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO shop_db.users (user_name, user_password, user_type) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, user_type], (err, result) => {
      if (err) {
        console.error('DBエラー:', err);
        return res.status(500).json({ error: 'DBエラー' });
      }
      res.status(201).json({ message: 'ユーザ登録成功' });
    });
  } catch (err) {
    console.error('サーバーエラー:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ===== JWT認証用ミドルウェア =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token
  if (!token) return res.status(401).json({ error: 'ログインしてください' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'トークン無効' });
    req.user = user; // user_typeやusernameがここに入る
    next();
  });
}

// ===== ログイン =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT user_password, user_type,user_id FROM shop_db.users WHERE user_name = ?';
  
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: 'DBエラー' });
    if (results.length === 0) return res.status(401).json({ error: 'ユーザーが存在しません' });

    const user = results[0];
    try {
      const match = await bcrypt.compare(password, user.user_password);
      if (!match) return res.status(401).json({ error: 'パスワードが違います' });

      // JWT生成
      const token = jwt.sign({ username: username, user_type: user.user_type }, JWT_SECRET, { expiresIn: '1h' });

      res.json({ message: 'ログイン成功', token: token, user_type: user.user_type ,username: username, user_id: user.user_id});

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  });
});


// ===== 商品一覧API =====
app.get('/api/allitems', (req, res) => {
  const sql = 'SELECT item_id, item_name, item_price, item_category, item_stock FROM shop_db.items';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('DBエラー:', err);
      return res.status(500).json({ error: 'DBエラー' });
    }
    console.log('商品データ取得:', results);
    res.json(results);
  });
});

// ===== 静的ページ（権限による振り分け） =====
app.get('/admin.html', authenticateToken, (req, res) => {
  if (req.user.user_type !== 'admin') return res.status(403).send('権限なし');
  res.sendFile(path.join(__dirname, 'public', 'html', 'admin.html'));
});

//購入処理。
app.post('/api/purchase', authenticateToken, (req, res) => {
  const { items } = req.body; 
  const user_id = req.body.user_id; // JWTにuser_idを含めておくと便利

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '購入アイテムが指定されていません' });
  }

  // 合計金額を計算
  const total_amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
console.log('合計金額:', total_amount);
  // トランザクション開始
  db.beginTransaction(async err => {
    if (err) return res.status(500).json({ error: 'DBエラー' });

    try {
      // 1. ordersにINSERT
      const orderSql = 'INSERT INTO shop_db.orders (user_id, order_date, total_amount) VALUES (?, NOW(), ?)';
      const [orderResult] = await db.promise().query(orderSql, [user_id, total_amount]);
      const order_id = orderResult.insertId; // 発行された注文ID

      // 2. order_itemsにINSERT + 在庫更新
      for (const item of items) {
        // 在庫更新
        const stockSql = 'UPDATE shop_db.items SET item_stock = item_stock - ? WHERE item_id = ? AND item_stock >= ?';
        const [stockResult] = await db.promise().query(stockSql, [item.quantity, item.item_id, item.quantity]);
        if (stockResult.affectedRows === 0) throw new Error(`在庫不足: item_id ${item.item_id}`);

        // order_itemsにINSERT
        const orderItemSql = 'INSERT INTO shop_db.order_item (order_id, item_id, quantity, item_price) VALUES (?, ?, ?, ?)';
        await db.promise().query(orderItemSql, [order_id, item.item_id, item.quantity, item.price]);
      }

      // コミット
      await db.promise().commit();
      res.json({ message: '購入処理が完了しました', order_id });

    } catch (err) {
      // ロールバック
      await db.promise().rollback();
      console.error('購入処理エラー:', err);
      res.status(500).json({ error: err.message });
    }
  });
});




// ===== サーバ起動 =====
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
