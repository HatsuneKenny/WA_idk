const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const secretKey = 'your_secret_key'; // Změňte na skutečný tajný klíč

app.use(bodyParser.json());

// Připojení k databázi
const db = new sqlite3.Database('./blog.db', (err) => {
    if (err) {
        console.error('Error connecting to the database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Registrace uživatele
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }

    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(query, [username, password], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ userId: this.lastID });
    });
});

// Přihlášení uživatele
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(query, [username, password], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Přidání příspěvku na blog
app.post('/api/blog', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ error: 'Token not provided' });
    }

    // Dekódování tokenu
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        const { content, date, author } = req.body;

        if (!content || !date || !author) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `INSERT INTO blog_posts (content, date, author) VALUES (?, ?, ?)`;
        const values = [content, date, author];

        db.run(query, values, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Post created', postId: this.lastID });
        });
    });
});

// Získání příspěvků
app.get('/api/blog', (req, res) => {
    const query = 'SELECT * FROM blog_posts';
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Aktualizace příspěvku
app.put('/api/blog/:id', (req, res) => {
    const { id } = req.params;
    const { content, date, author } = req.body;

    if (!content && !date && !author) {
        return res.status(400).json({ error: 'Nothing to update' });
    }

    const updates = [];
    const values = [];
    if (content) {
        updates.push('content = ?');
        values.push(content);
    }
    if (date) {
        updates.push('date = ?');
        values.push(date);
    }
    if (author) {
        updates.push('author = ?');
        values.push(author);
    }

    values.push(id);
    const query = `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, values, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Post updated' });
    });
});

// Odstranění příspěvku
app.delete('/api/blog/:id', (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM blog_posts WHERE id = ?`;
    db.run(query, id, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted' });
    });
});

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
