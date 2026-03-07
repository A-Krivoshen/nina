(() => {
  const grid = document.getElementById('grid');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const clearBtn = document.getElementById('clearBtn');
  const resultsInfo = document.getElementById('resultsInfo');

  const viewer = document.getElementById('viewer');
  const viewerImg = document.getElementById('viewerImg');
  const viewerCaption = document.getElementById('viewerCaption');
  const viewerCount = document.getElementById('viewerCount');
  const viewerDate = document.getElementById('viewerDate');
  const stage = document.querySelector('.viewer__stage');

  let allItems = [];
  let items = [];
  let current = -1;

  // zoom state
  let scale = 1;
  const SCALE_MIN = 1;
  const SCALE_MAX = 3;

  // swipe state
  let touchStartX = 0;
  let touchStartY = 0;
  let touching = false;

  const cleanCaption = (name) =>
    name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();

  const getDateLabel = (name) => {
    const m = name.match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) return 'Без даты';
    return `${m[3]}.${m[2]}.${m[1]}`;
  };

  const getStamp = (name) => {
    const m = name.match(/(\d{8})_(\d{6})/);
    return m ? Number(`${m[1]}${m[2]}`) : 0;
  };

  const setZoom = (val) => {
    scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, val));
    viewerImg.style.transform = `scale(${scale})`;
    viewerImg.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
  };

  const resetZoom = () => setZoom(1);

  const updateViewerMeta = () => {
    if (current < 0) return;
    viewerCount.textContent = `${current + 1} / ${items.length}`;
    viewerDate.textContent = items[current].date;
  };

  const openViewer = (index) => {
    current = index;
    const it = items[current];

    viewerImg.src = it.full;
    viewerImg.alt = it.caption;
    viewerCaption.textContent = it.caption;

    updateViewerMeta();
    resetZoom();

    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // prefetch соседних
    const next = items[(current + 1) % items.length];
    const prev = items[(current - 1 + items.length) % items.length];
    [next.full, prev.full].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  };

  const closeViewer = () => {
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    viewerImg.src = '';
    current = -1;
    resetZoom();
  };

  const nav = (dir) => {
    if (current < 0 || items.length === 0) return;
    const nextIndex = (dir === 'next')
      ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
    openViewer(nextIndex);
  };

  const updateResultsInfo = () => {
    if (!resultsInfo) return;
    resultsInfo.textContent = `Показано ${items.length} из ${allItems.length}`;
  };

  const sortItems = (list, mode) => {
    const arr = [...list];

    if (mode === 'old') {
      return arr.sort((a, b) => a.stamp - b.stamp);
    }
    if (mode === 'name-asc') {
      return arr.sort((a, b) => a.caption.localeCompare(b.caption, 'ru'));
    }
    if (mode === 'name-desc') {
      return arr.sort((a, b) => b.caption.localeCompare(a.caption, 'ru'));
    }

    return arr.sort((a, b) => b.stamp - a.stamp);
  };

  const renderGrid = () => {
    grid.innerHTML = '';

    items.forEach((it, idx) => {
      const fig = document.createElement('figure');
      fig.className = 'card';
      fig.setAttribute('role', 'button');
      fig.setAttribute('tabindex', '0');
      fig.innerHTML = `
        <img loading="lazy" decoding="async" src="${it.thumb}" alt="${it.caption}">
        <div class="card__meta">
          <figcaption>${it.caption}</figcaption>
          <span class="card__date">${it.date}</span>
        </div>
      `;
      fig.addEventListener('click', () => openViewer(idx));
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openViewer(idx);
        }
      });
      grid.appendChild(fig);
    });

    statusEl.hidden = true;
    grid.hidden = false;
    if (countEl) countEl.textContent = String(allItems.length);

    if (items.length === 0) {
      statusEl.textContent = 'Ничего не найдено. Измени запрос или сбрось фильтр.';
      statusEl.hidden = false;
    }

    updateResultsInfo();
  };

  const applyFilters = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const mode = sortSelect?.value || 'new';

    const filtered = allItems.filter((it) => {
      if (!query) return true;
      const haystack = `${it.name} ${it.caption} ${it.date}`.toLowerCase();
      return haystack.includes(query);
    });

    items = sortItems(filtered, mode);
    renderGrid();
  };

  const showError = (msg) => {
    statusEl.textContent = msg;
    statusEl.hidden = false;
    grid.hidden = true;
    updateResultsInfo();
    if (countEl) countEl.textContent = '—';
  };

  // close / nav handlers
  viewer.addEventListener('click', (e) => {
    const close = e.target?.dataset?.close;
    const navDir = e.target?.dataset?.nav;
    if (close) closeViewer();
    if (navDir) nav(navDir);
  });

  // keys
  window.addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') nav('next');
    if (e.key === 'ArrowLeft') nav('prev');
    if (e.key === '0') resetZoom();
  });

  // wheel zoom (desktop)
  stage?.addEventListener('wheel', (e) => {
    if (!viewer.classList.contains('is-open')) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setZoom(scale + delta);
  }, { passive: false });

  // double click to toggle zoom
  viewerImg.addEventListener('dblclick', () => {
    setZoom(scale > 1 ? 1 : 2);
  });

  // click to zoom in/out
  viewerImg.addEventListener('click', (e) => {
    if (e.target !== viewerImg) return;
    setZoom(scale > 1 ? 1 : 2);
  });

  // swipe (mobile)
  stage?.addEventListener('touchstart', (e) => {
    if (!viewer.classList.contains('is-open')) return;
    const t = e.touches[0];
    touching = true;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  stage?.addEventListener('touchend', (e) => {
    if (!touching) return;
    touching = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx > 60) nav('prev');
    else if (dx < -60) nav('next');
  }, { passive: true });

  searchInput?.addEventListener('input', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);

  clearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'new';
    applyFilters();
    searchInput?.focus();
  });

  // load manifest
  fetch('images.json', { cache: 'no-store' })
    .then((r) => r.ok ? r.json() : Promise.reject(new Error('images.json not found')))
    .then((list) => {
      if (!Array.isArray(list) || list.length === 0) {
        showError('images.json пустой. Пересоздай его из корня проекта.');
        return;
      }

      allItems = list.map((name) => ({
        name,
        thumb: `thumbs/${name}`,
        full: `img/${name}`,
        caption: cleanCaption(name),
        date: getDateLabel(name),
        stamp: getStamp(name),
      }));

      applyFilters();
    })
    .catch(() => {
      showError('Не вижу images.json. Проверь, что он лежит в корне репозитория.');
    });
})();
