// 🧠 API Keys hier eintragen
const NUTRITIONIX_APP_ID = '09446b3a';
const NUTRITIONIX_API_KEY = '8f92318bd0ffeda0ff1ca5cf27dd5dbb';
const SPOONACULAR_API_KEY = 'DEIN_SPOONACULAR_API_KEY';

async function searchFood() {
  const query = document.getElementById('searchInput').value;
  document.getElementById('result').innerHTML = '🔄 Suche läuft...';

  let data = await searchNutritionix(query);
  if (!data) data = await searchOpenFoodFacts(query);
  if (!data) data = await searchSpoonacular(query);

  if (data) {
    showResult(data);
    localStorage.setItem('lastResult', JSON.stringify(data));
  } else {
    document.getElementById('result').innerHTML = '❌ Kein Ergebnis gefunden.';
  }
}

function showResult(item) {
  document.getElementById('result').innerHTML = `
    <h3>${item.name}</h3>
    <p><strong>Marke:</strong> ${item.brand || 'Unbekannt'}</p>
    <p><strong>Kalorien:</strong> ${item.calories} kcal</p>
    <p><strong>Kohlenhydrate:</strong> ${item.carbs} g</p>
    <p><strong>Zucker:</strong> ${item.sugar || '-'} g</p>
    <p><strong>Eiweiß:</strong> ${item.protein || '-'} g</p>
    <p><strong>Fett:</strong> ${item.fat || '-'} g</p>
    <button onclick='addToFavorites(${JSON.stringify(item)})'>⭐ Favorisieren</button>
  `;
}

function calculateCarbs() {
  const grams = parseFloat(document.getElementById('gramsInput').value);
  const carbsPer100 = parseFloat(document.getElementById('carbsPer100Input').value);

  if (!isNaN(grams) && !isNaN(carbsPer100)) {
    const total = (grams * carbsPer100) / 100;
    document.getElementById('carbResult').innerText = `≈ ${total.toFixed(1)} g Kohlenhydrate`;
  } else {
    document.getElementById('carbResult').innerText = 'Bitte gültige Werte eingeben.';
  }
}

// FAVORITEN
function addToFavorites(item) {
  let favs = JSON.parse(localStorage.getItem('glucoFavorites') || '[]');
  if (!favs.find(f => f.name === item.name)) {
    favs.push(item);
    localStorage.setItem('glucoFavorites', JSON.stringify(favs));
    alert('Zu Favoriten hinzugefügt!');
  }
}

function toggleFavorites() {
  const panel = document.getElementById('favoritesPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  loadFavorites();
}

function loadFavorites() {
  const favs = JSON.parse(localStorage.getItem('glucoFavorites') || '[]');
  const list = document.getElementById('favoritesList');
  list.innerHTML = '';
  favs.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `${item.name} (${item.carbs} g KH) <span class="removeFav" onclick="removeFavorite(${index})">✖</span>`;
    list.appendChild(li);
  });
}

function removeFavorite(index) {
  let favs = JSON.parse(localStorage.getItem('glucoFavorites') || '[]');
  favs.splice(index, 1);
  localStorage.setItem('glucoFavorites', JSON.stringify(favs));
  loadFavorites();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem('darkmode', document.body.classList.contains("dark"));
}

window.onload = () => {
  if (localStorage.getItem('darkmode') === 'true') {
    document.body.classList.add('dark');
  }

  const last = localStorage.getItem('lastResult');
  if (last) {
    showResult(JSON.parse(last));
  }
};

// API-Funktionen (wie zuvor – Nutritionix, OpenFoodFacts, Spoonacular) kannst du von der vorherigen Version übernehmen.
