document.addEventListener('DOMContentLoaded', () => {
  const productInput = document.getElementById('product');
  const brandInput = document.getElementById('brand');
  const gramsInput = document.getElementById('grams');
  const form = document.getElementById('product-form');
  const suggestionsList = document.getElementById('suggestions');
  const loading = document.getElementById('loading');
  const loadingBar = document.getElementById('loading-bar');
  const result = document.getElementById('result');
  const carbsPer100gSpan = document.getElementById('carbs-per-100g');
  const inputGramsSpan = document.getElementById('input-grams');
  const carbsTotalSpan = document.getElementById('carbs-total');
  const favoritesList = document.getElementById('favorites-list');
  const saveFavoriteBtn = document.getElementById('save-favorite');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  const suggestionsBtn = document.getElementById('show-suggestions-btn');
  const chartCanvas = document.getElementById('day-chart');

  let currentProduct = null;
  let chart;
  let dayKey = `day-${new Date().toISOString().split('T')[0]}`;

  // Theme Toggle
  toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }

  // Lade Favoriten aus LocalStorage
  function loadFavorites() {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    favoritesList.innerHTML = '';
    favs.forEach((f, i) => {
      const li = document.createElement('li');
      li.textContent = `${f.product} (${f.brand}) - ${f.carbsPer100g}g KH / 100g`;
      li.addEventListener('click', () => {
        productInput.value = f.product;
        brandInput.value = f.brand;
        gramsInput.value = '';
        suggestionsList.innerHTML = '';
      });
      const del = document.createElement('button');
      del.textContent = 'X';
      del.title = "Favorit löschen";
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        favs.splice(i, 1);
        localStorage.setItem('favorites', JSON.stringify(favs));
        loadFavorites();
      });
      li.appendChild(del);
      favoritesList.appendChild(li);
    });
  }
  loadFavorites();

  // Tagesverlauf Diagramm aktualisieren
  function updateChart() {
    const entries = JSON.parse(localStorage.getItem(dayKey) || '[]');
    const labels = entries.map(e => `${e.product} (${e.grams}g)`);
    const data = entries.map(e => e.carbsTotal);

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'KH in g',
          data,
          backgroundColor: '#4caf50'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
  updateChart();

  // Ladebalken Animation
  function animateLoadingBar() {
    return new Promise((resolve) => {
      loadingBar.style.width = '0%';
      loading.classList.remove('hidden');

      let width = 0;
      const interval = setInterval(() => {
        width += 4; // 4% alle 50ms → ca 2,5s gesamt
        loadingBar.style.width = width + '%';
        if (width >= 100) {
          clearInterval(interval);
          loading.classList.add('hidden');
          resolve();
        }
      }, 50);
    });
  }

  // Produktsuche & Anzeige Vorschläge (nur bei Klick auf Button)
  suggestionsBtn.addEventListener('click', async () => {
    const query = productInput.value.trim();
    suggestionsList.innerHTML = '';
    if (query.length < 3) {
      alert('Bitte mindestens 3 Zeichen für die Produktsuche eingeben.');
      return;
    }
    suggestionsBtn.disabled = true;
    suggestionsBtn.textContent = 'Lade Vorschläge...';

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
      const res = await fetch(url);
      const data = await res.json();

      const seen = new Set();
      let count = 0;

      for (const p of data.products) {
        if (!p.product_name || !p.brands) continue;
        const name = p.product_name.trim();
        const brand = p.brands.trim();
        const displayName = `${name} (${brand})`;

        // Prüfen auf Duplikate (Name + Brand)
        if (seen.has(displayName.toLowerCase())) continue;

        seen.add(displayName.toLowerCase());

        const li = document.createElement('li');
        li.textContent = `Vorgeschlagen: ${displayName}`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          productInput.value = name;
          brandInput.value = brand;
          suggestionsList.innerHTML = '';
        });
        suggestionsList.appendChild(li);

        count++;
        if (count >= 10) break; // max 10 Vorschläge
      }

      if (count === 0) {
        const li = document.createElement('li');
        li.textContent = 'Keine Vorschläge gefunden.';
        suggestionsList.appendChild(li);
      }
    } catch (e) {
      console.error(e);
      alert('Fehler bei der Vorschlagsuche.');
    }

    suggestionsBtn.disabled = false;
    suggestionsBtn.textContent = 'Vorgeschlagene Produkte anzeigen';
  });

  // Produkt berechnen und anzeigen
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    result.classList.add('hidden');       // Ergebnis verstecken vor neuer Berechnung
    suggestionsList.innerHTML = '';

    const product = productInput.value.trim();
    const brand = brandInput.value.trim();
    const grams = parseFloat(gramsInput.value);

    if (!product || !brand || isNaN(grams) || grams <= 0) {
      alert('Bitte Produkt, Marke und gültige Grammzahl eingeben.');
      return;
    }

    await animateLoadingBar();             // Ladebalken komplett abwarten

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(product + ' ' + brand)}&search_simple=1&action=process&json=1&page_size=50`;
      const res = await fetch(url);
      const data = await res.json();

      const match = data.products.find(p => {
        if (!p.product_name || !p.brands || !p.nutriments) return false;
        const prodName = p.product_name.toLowerCase();
        const prodBrand = p.brands.toLowerCase();
        return prodName.includes(product.toLowerCase()) &&
               prodBrand.includes(brand.toLowerCase()) &&
               (p.nutriments.carbohydrates !== undefined || p.nutriments['carbohydrates_100g'] !== undefined);
      });

      if (match) {
        const carbsPer100g = parseFloat(match.nutriments.carbohydrates ?? match.nutriments.carbohydrates_100g);
        if (isNaN(carbsPer100g)) {
          alert('Für das Produkt konnten keine Kohlenhydrate gefunden werden.');
          return;
        }
        const carbsTotal = ((carbsPer100g * grams) / 100).toFixed(1);

        // Ergebnis erst jetzt anzeigen
        carbsPer100gSpan.textContent = carbsPer100g.toFixed(1);
        inputGramsSpan.textContent = grams;
        carbsTotalSpan.textContent = carbsTotal;

        currentProduct = { product, brand, carbsPer100g: carbsPer100g.toFixed(1), grams, carbsTotal: parseFloat(carbsTotal) };

        result.classList.remove('hidden');

        // Tagesverlauf speichern
        let entries = JSON.parse(localStorage.getItem(dayKey) || '[]');
        entries.push(currentProduct);
        localStorage.setItem(dayKey, JSON.stringify(entries));
        updateChart();

      } else {
        alert('Produkt wurde nicht gefunden. Bitte überprüfe Produkt und Marke.');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Produktanfrage.');
    }
  });

  // Favorit speichern
  saveFavoriteBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!favs.some(f => f.product === currentProduct.product && f.brand === currentProduct.brand)) {
      favs.push(currentProduct);
      localStorage.setItem('favorites', JSON.stringify(favs));
      loadFavorites();
      alert('Favorit gespeichert!');
    } else {
      alert('Dieses Produkt ist bereits als Favorit gespeichert.');
    }
  });

});
