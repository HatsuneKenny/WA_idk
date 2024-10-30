const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const SECRET_KEY = 'your_secret_key';
const PORT = 3000;

app.use(express.json());

// Inicializace databáze
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    isAdmin BOOLEAN
  )`);
  db.run(`CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    created_at TEXT,
    author TEXT,
    author_id INTEGER,
    visible_to TEXT,
    FOREIGN KEY (author_id) REFERENCES users(id)
  )`);
});

// Middleware pro ověření tokenu
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

// Endpoint pro registraci nového uživatele
app.post('/api/register', async (req, res) => {
  const { username, password, isAdmin = false } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(`INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)`, 
    [username, hashedPassword, isAdmin], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ userId: this.lastID });
    }
  );
});

// Endpoint pro přihlášení uživatele
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

// GET /api/blog - zobrazí všechny dostupné příspěvky podle viditelnosti
app.get('/api/blog', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

  const query = isAdmin 
    ? `SELECT * FROM blog_posts`
    : `SELECT * FROM blog_posts WHERE visible_to LIKE ? OR author_id = ? OR visible_to IS NULL`;
  const params = isAdmin ? [] : [`%${userId}%`, userId];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/blog - vytvoření nového příspěvku
app.post('/api/blog', authenticateToken, (req, res) => {
  const { content, visible_to } = req.body;
  const created_at = new Date().toISOString();
  const author = req.user.username;
  const author_id = req.user.id;

  db.run(`INSERT INTO blog_posts (content, created_at, author, author_id, visible_to) VALUES (?, ?, ?, ?, ?)`, 
    [content, created_at, author, author_id, visible_to ? visible_to.join(',') : null], 
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ postId: this.lastID });
    }
  );
});

// DELETE /api/blog/:blogId - smazání příspěvku, pokud ho uživatel vlastní nebo je admin
app.delete('/api/blog/:blogId', authenticateToken, (req, res) => {
  const { blogId } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

  db.get(`SELECT * FROM blog_posts WHERE id = ?`, [blogId], (err, post) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.author_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.run(`DELETE FROM blog_posts WHERE id = ?`, [blogId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Post deleted' });
    });
  });
});

// PATCH /api/blog/:blogId - aktualizace příspěvku
app.patch('/api/blog/:blogId', authenticateToken, (req, res) => {
  const { blogId } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;
  const { content, visible_to } = req.body;

  db.get(`SELECT * FROM blog_posts WHERE id = ?`, [blogId], (err, post) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.author_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = [];
    const values = [];

    if (content) {
      updates.push('content = ?');
      values.push(content);
    }
    if (visible_to) {
      updates.push('visible_to = ?');
      values.push(visible_to.join(','));
    }

    values.push(blogId);
    const query = `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Post updated' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
