const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Nastavení portu
const port = process.env.PORT || 3000;

// Použití middleware pro parsování JSON dat
app.use(express.json());

// Připojení k databázi
const dbURI = 'mongodb://localhost:27017/mydatabase';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Připojeno k databázi'))
  .catch(err => console.log('Chyba připojení k databázi:', err));

// Model pro příspěvky
const Post = mongoose.model('Post', new mongoose.Schema({
  author: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
}));

// Route pro získání všech příspěvků
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při načítání příspěvků', error });
  }
});

// Route pro přidání nového příspěvku
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

// Route pro úpravu příspěvku
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

// Route pro smazání příspěvku
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

// Route pro vrácení HTML stránky s embedded JavaScript
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blog API</title>
    </head>
    <body>
      <h1>Blog Příspěvky</h1>

      <!-- Formulář pro nový příspěvek -->
      <form id="new-post-form">
        <label for="author">Autor:</label>
        <input type="text" id="author" required>
        <br>
        <label for="content">Obsah:</label>
        <textarea id="content" required></textarea>
        <br>
        <button type="submit">Přidat Příspěvek</button>
      </form>

      <div id="blog-posts">
        <!-- Příspěvky budou zobrazeny zde -->
      </div>

      <script>
        // Základní URL adresa API
        const API_URL = "/posts";

        // Funkce pro získání a zobrazení všech příspěvků
        async function fetchPosts() {
          try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("Nepodařilo se načíst příspěvky");

            const posts = await response.json();
            const postsContainer = document.getElementById('blog-posts');
            postsContainer.innerHTML = '';  // Vyprázdníme container před zobrazením nových příspěvků
            
            posts.forEach(post => {
              const postDiv = document.createElement('div');
              postDiv.className = 'blog-post';
              postDiv.innerHTML = `
                <h3>Autor: ${post.author}</h3>
                <p>${post.content}</p>
                <p><small>Vytvořeno: ${new Date(post.createdAt).toLocaleDateString()}</small></p>
                <button class="edit" onclick="editPost('${post._id}')">Upravit</button>
                <button class="delete" onclick="deletePost('${post._id}')">Smazat</button>
              `;
              postsContainer.appendChild(postDiv);
            });
          } catch (error) {
            alert(error.message);
          }
        }

        // Funkce pro přidání nového příspěvku
        document.getElementById('new-post-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const author = document.getElementById('author').value;
          const content = document.getElementById('content').value;

          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ author, content })
            });

            if (response.ok) {
              const newPost = await response.json();
              console.log("Nový příspěvek ID:", newPost._id);
              await fetchPosts(); // Načteme příspěvky znovu
              document.getElementById('new-post-form').reset(); // Vyprázdní formulář
            } else {
              throw new Error("Nepodařilo se vytvořit nový příspěvek");
            }
          } catch (error) {
            alert(error.message);
          }
        });

        // Funkce pro smazání příspěvku
        async function deletePost(id) {
          if (confirm("Opravdu chcete smazat tento příspěvek?")) {
            try {
              const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

              if (response.ok) {
                await fetchPosts(); // Načteme příspěvky znovu
              } else {
                throw new Error('Chyba při mazání příspěvku');
              }
            } catch (error) {
              alert(error.message);
            }
          }
        }

        // Funkce pro úpravu příspěvku
        async function editPost(id) {
          const newContent = prompt("Zadejte nový obsah příspěvku:");

          if (newContent) {
            try {
              const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent })
              });

              if (response.ok) {
                await fetchPosts(); // Načteme příspěvky znovu
              } else {
                throw new Error('Chyba při úpravě příspěvku');
              }
            } catch (error) {
              alert(error.message);
            }
          }
        }

        // Načtení příspěvků při spuštění stránky
        fetchPosts();
      </script>
    </body>
    </html>
  `);
});

// Spuštění serveru
app.listen(port, () => {
  console.log(`Server běží na http://localhost:${port}`);
});
