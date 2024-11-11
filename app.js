// Základní URL adresa API na AWS
const API_URL = "https://moje-api-server-adresa.com/api/blog"; // Nahraďte svou skutečnou URL adresou API na AWS

// Získání a zobrazení všech příspěvků
async function fetchPosts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Nepodařilo se načíst příspěvky");

    const posts = await response.json();
    const postsContainer = document.getElementById('blog-posts');
    postsContainer.innerHTML = '';
    
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

// Přidání nového příspěvku
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
      const newPost = await response.json(); // získáme identifikátor nového příspěvku
      console.log("Nový příspěvek ID:", newPost.id); // zobrazí identifikátor v konzoli
      await fetchPosts();
      document.getElementById('new-post-form').reset();
    } else {
      throw new Error("Nepodařilo se vytvořit nový příspěvek");
    }
  } catch (error) {
    alert(error.message);
  }
});

// Smazání příspěvku
async function deletePost(id) {
  if (confirm("Opravdu chcete smazat tento příspěvek?")) {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

      if (response.ok) {
        await fetchPosts();
      } else {
        throw new Error('Chyba při mazání příspěvku');
      }
    } catch (error) {
      alert(error.message);
    }
  }
}

// Úprava příspěvku
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
        await fetchPosts();
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
