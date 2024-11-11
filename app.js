// Základní URL adresa API
const API_URL = "/posts"; // Změněno na relativní URL, protože frontend a backend běží na stejném serveru

// Funkce pro získání a zobrazení všech příspěvků
async function fetchPosts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Nepodařilo se načíst příspěvky");

    const posts = await response.json();
    const postsContainer = document.getElementById('blog-posts');
    postsContainer.innerHTML = '';  // Vyprázdníme container před zobrazením nových příspěvků
    
    if (posts.length === 0) {
      postsContainer.innerHTML = '<p>Žádné příspěvky k zobrazení.</p>';
    } else {
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
    }
  } catch (error) {
    alert(error.message);
  }
}

// Funkce pro přidání nového příspěvku
document.getElementById('new-post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const author = document.getElementById('author').value;
  const content = document.getElementById('content').value;

  // Ověření, že autor a obsah nejsou prázdné
  if (!author || !content) {
    alert('Prosím vyplňte všechna pole!');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content })
    });

    if (response.ok) {
      const newPost = await response.json();
      console.log("Nový příspěvek ID:", newPost._id); // Zobrazení ID nového příspěvku
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

  if (newContent && newContent !== "") {
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
  } else {
    alert("Obsah příspěvku nemůže být prázdný!");
  }
}

// Načtení příspěvků při spuštění stránky
fetchPosts();
