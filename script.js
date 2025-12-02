// script.js
// Smooth, flicker-free list of coin NAMES + slide panel (right) with details.
// No chart (per request). Dark/light, search box + button, smooth updates.

document.addEventListener('DOMContentLoaded', () => {
  const REFRESH_INTERVAL = 5000;
  const TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';

  // State
  let allTickers = [];          // raw data
  let filteredTickers = [];     // after search
  let autoTimer = null;
  let currentOpenSymbol = null;

  // Elements
  const listContainer = document.getElementById('listContainer');
  const tickerCount = document.getElementById('tickerCount');
  const lastUpdate = document.getElementById('lastUpdate');
  const errorBanner = document.getElementById('errorBanner');

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const themeToggle = document.getElementById('themeToggle');

  const overlay = document.getElementById('overlay');
  const backdrop = document.getElementById('backdrop');
  const slidePanel = document.getElementById('slidePanel');
  const closePanel = document.getElementById('closePanel');

  const panelTitle = document.getElementById('panelTitle');
  const panelSubtitle = document.getElementById('panelSubtitle');

  const detailPrice = document.getElementById('detailPrice');
  const detailChange = document.getElementById('detailChange');
  const detailVolume = document.getElementById('detailVolume');
  const detailHigh = document.getElementById('detailHigh');
  const detailLow = document.getElementById('detailLow');
  const detailOpen = document.getElementById('detailOpen');
  const detailQV = document.getElementById('detailQV');

  // UTIL
  function formatNumber(n) {
    if (!n && n !== 0) return '—';
    const num = Number(n);
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
  }
  function formatTime(ts = Date.now()) {
    return new Date(ts).toLocaleString();
  }
  function symbolToDisplay(sym) {
    if (!sym) return sym;
    return sym.replace(/USDT$/, '/USDT').replace(/BUSD$/, '/BUSD');
  }

  // THEME
  function initTheme() {
    const stored = localStorage.getItem('theme-dark');
    if (stored === '1') {
      document.documentElement.classList.add('dark');
      themeToggle.textContent = 'Light';
    } else {
      document.documentElement.classList.remove('dark');
      themeToggle.textContent = 'Dark';
    }
  }
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme-dark', isDark ? '1' : '0');
    themeToggle.textContent = isDark ? 'Light' : 'Dark';
  });

  // Load tickers once
  async function loadTickers() {
    try {
      errorBanner.style.display = 'none';
      const res = await fetch(TICKER_URL);
      if (!res.ok) throw new Error('Network ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Bad format');
      allTickers = data;
      filteredTickers = [...allTickers];
      tickerCount.textContent = allTickers.length;
      lastUpdate.textContent = formatTime();
      renderList(); // initial render (names only)
    } catch (err) {
      console.error('loadTickers error', err);
      errorBanner.style.display = 'block';
    }
  }

  // Render list of names (only once). We avoid re-rendering on each refresh to prevent blink.
  function renderList() {
    listContainer.innerHTML = '';
    // Render all names (could be many) — keep them simple to remain performant
    for (const t of filteredTickers) {
      const btn = document.createElement('button');
      btn.className = 'coin-btn text-left px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition';
      btn.setAttribute('data-symbol', t.symbol);
      btn.setAttribute('type', 'button');
      btn.innerHTML = `
        <div class="text-sm text-gray-600 dark:text-gray-300">${t.symbol.replace(/USDT|BUSD|BTC|ETH$/,'')}</div>
        <div class="text-xs text-gray-400 dark:text-gray-400">${t.symbol}</div>
      `;
      // click opens panel
      btn.addEventListener('click', () => openPanel(t.symbol));
      listContainer.appendChild(btn);
    }
  }

  // Update list visibility after search (without full data re-fetch)
  function applySearchRender() {
    // fast approach: clear and re-render filtered subset (names only)
    listContainer.innerHTML = '';
    for (const t of filteredTickers) {
      const btn = document.createElement('button');
      btn.className = 'coin-btn text-left px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition';
      btn.setAttribute('data-symbol', t.symbol);
      btn.setAttribute('type', 'button');
      btn.innerHTML = `
        <div class="text-sm text-gray-600 dark:text-gray-300">${t.symbol.replace(/USDT|BUSD|BTC|ETH$/,'')}</div>
        <div class="text-xs text-gray-400 dark:text-gray-400">${t.symbol}</div>
      `;
      btn.addEventListener('click', () => openPanel(t.symbol));
      listContainer.appendChild(btn);
    }
  }

  // Open slide panel and populate details (pull from latest allTickers)
  function openPanel(symbol) {
    currentOpenSymbol = symbol;
    const ticker = allTickers.find(t => t.symbol === symbol);
    if (!ticker) return;

    panelTitle.textContent = symbolToDisplay(symbol);
    panelSubtitle.textContent = symbol;
    detailPrice.textContent = '$' + Number(ticker.lastPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
    detailChange.textContent = Number(ticker.priceChangePercent).toFixed(2) + '%';
    detailChange.className = Number(ticker.priceChangePercent) >= 0 ? 'text-green-600 font-semibold px-2 py-1 rounded' : 'text-red-600 font-semibold px-2 py-1 rounded';
    detailVolume.textContent = 'Vol: ' + formatNumber(ticker.volume);
    detailHigh.textContent = '$' + Number(ticker.highPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
    detailLow.textContent = '$' + Number(ticker.lowPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
    detailOpen.textContent = '$' + Number(ticker.openPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
    detailQV.textContent = formatNumber(ticker.quoteVolume);

    // show overlay and slide-in
    overlay.classList.remove('hidden');
    backdrop.style.opacity = '0';
    requestAnimationFrame(() => {
      backdrop.style.transition = 'opacity 220ms ease';
      backdrop.style.opacity = '1';
    });
    slidePanel.classList.remove('translate-x-full');
    slidePanel.style.transform = 'translateX(0)';
  }

  // Close panel
  function closePanelFn() {
    slidePanel.style.transform = 'translateX(100%)';
    backdrop.style.opacity = '0';
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 260);
    currentOpenSymbol = null;
  }

  backdrop.addEventListener('click', closePanelFn);
  closePanel.addEventListener('click', closePanelFn);

  // Search handling
  function performSearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      filteredTickers = [...allTickers];
    } else {
      filteredTickers = allTickers.filter(t => {
        const s = t.symbol.toLowerCase();
        const base = s.replace(/usdt|busd|btc|eth/g, '');
        return s.includes(q) || base.includes(q);
      });
    }
    tickerCount.textContent = filteredTickers.length;
    applySearchRender();
  }
  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Smooth refresh: fetch new data and update only open-panel content & lastUpdate.
  async function refreshTickers() {
    try {
      errorBanner.style.display = 'none';
      const res = await fetch(TICKER_URL);
      if (!res.ok) throw new Error('Network ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Bad format');

      // Replace master data (allTickers) but don't touch the DOM list of names (no blink)
      allTickers = data;
      lastUpdate.textContent = formatTime();

      // If panel is open, update its fields from the new data (smooth)
      if (currentOpenSymbol) {
        const t = allTickers.find(x => x.symbol === currentOpenSymbol);
        if (t) {
          detailPrice.textContent = '$' + Number(t.lastPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
          detailChange.textContent = Number(t.priceChangePercent).toFixed(2) + '%';
          detailChange.className = Number(t.priceChangePercent) >= 0 ? 'text-green-600 font-semibold px-2 py-1 rounded' : 'text-red-600 font-semibold px-2 py-1 rounded';
          detailVolume.textContent = 'Vol: ' + formatNumber(t.volume);
          detailHigh.textContent = '$' + Number(t.highPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
          detailLow.textContent = '$' + Number(t.lowPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
          detailOpen.textContent = '$' + Number(t.openPrice).toLocaleString(undefined, {maximumFractionDigits: 8});
          detailQV.textContent = formatNumber(t.quoteVolume);
        }
      }

    } catch (err) {
      console.error('refreshTickers error', err);
      errorBanner.style.display = 'block';
    } finally {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(refreshTickers, REFRESH_INTERVAL);
    }
  }

  // INIT
  initTheme();
  loadTickers().then(() => {
    // Start smooth refresh loop
    refreshTickers();
  });
});
