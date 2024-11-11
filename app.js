// Importování potřebných modulů
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

// Nastavení portu
const port = process.env.PORT || 3000;

// Použití middleware pro parsování JSON dat
app.use(express.json());

// Nastavení statických souborů (pokud nějaké máš)
app.use(express.static(path.join(__dirname, 'public')));

// Připojení k databázi (pokud používáš MongoDB nebo jinou databázi)
const dbURI = 'mongodb://localhost:27017/mydatabase'; // Tady si uprav připojení k databázi
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Připojeno k databázi'))
  .catch(err => console.log('Chyba připojení k databázi:', err));

// Model pro příspěvky v blogu (pokud používáš MongoDB)
const Post = mongoose.model('Post', new mongoose.Schema({
  author: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
}));

// Základní route, která vrátí text
app.get('/', (req, res) => {
  res.send('Hello World! Server běží');
});

// API route pro získání všech příspěvků
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find(); // Získání všech příspěvků z databáze
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při načítání příspěvků', error });
  }
});

// API route pro přidání nového příspěvku
app.post('/posts', async (req, res) => {
  const { author, content } = req.body;
  
  try {
    const newPost = new Post({ author, content });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při přidávání příspěvku', error });
  }
});

// API route pro úpravu příspěvku
app.patch('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  try {
    const post = await Post.findByIdAndUpdate(id, { content }, { new: true });
    if (!post) {
      return res.status(404).json({ message: 'Příspěvek nenalezen' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při úpravě příspěvku', error });
  }
});

// API route pro smazání příspěvku
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ message: 'Příspěvek nenalezen' });
    }
    res.json({ message: 'Příspěvek smazán' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při mazání příspěvku', error });
  }
});

// Chybová stránka pro nesprávné cesty
app.use((req, res) => {
  res.status(404).send('Stránka nenalezena');
});

// Spuštění serveru
app.listen(port, () => {
  console.log(`Server běží na http://localhost:${port}`);
});

module.exports = app;
