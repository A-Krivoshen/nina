(() => {
  const grid = document.getElementById('grid');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');

  const viewer = document.getElementById('viewer');
  const viewerImg = document.getElementById('viewerImg');
  const viewerCaption = document.getElementById('viewerCaption');
  const viewerCount = document.getElementById('viewerCount');
  const stage = document.querySelector('.viewer__stage');

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

  const setZoom = (val) => {
    scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, val));
    viewerImg.style.transform = `scale(${scale})`;
    viewerImg.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
  };

  const resetZoom = () => setZoom(1);

  const updateViewerMeta = () => {
    if (current < 0) return;
    viewerCount.textContent = `${current + 1} / ${items.length}`;
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

    // лёгкий prefetch следующей
    const next = items[(current + 1) % items.length];
    const img = new Image();
    img.src = next.full;
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
    if (current < 0) return;
    const nextIndex = (dir === 'next')
      ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
    openViewer(nextIndex);
  };

  const render = (list) => {
    // новые сверху
    const files = [...list].sort().reverse();

    items = files.map((name) => ({
      name,
      thumb: `thumbs/${name}`,
      full: `img/${name}`,
      caption: cleanCaption(name),
    }));

    grid.innerHTML = '';
    items.forEach((it, idx) => {
      const fig = document.createElement('figure');
      fig.className = 'card';
      fig.innerHTML = `
        <img loading="lazy" src="${it.thumb}" alt="${it.caption}">
        <figcaption>${it.caption}</figcaption>
      `;
      fig.addEventListener('click', () => openViewer(idx));
      grid.appendChild(fig);
    });

    statusEl.hidden = true;
    grid.hidden = false;

    if (countEl) countEl.textContent = String(items.length);
  };

  const showError = (msg) => {
    statusEl.textContent = msg;
    statusEl.hidden = false;
    grid.hidden = true;
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

  // click to zoom in/out (optional feeling)
  viewerImg.addEventListener('click', (e) => {
    // не мешаем навигации кнопками
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

    // чтобы вертикальный скролл не превращался в свайп
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx > 60) nav('prev');
    else if (dx < -60) nav('next');
  }, { passive: true });

  // load manifest
  fetch('images.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('images.json not found')))
    .then(list => {
      if (!Array.isArray(list) || list.length === 0) {
        showError('images.json пустой. Пересоздай его из корня проекта.');
        return;
      }
      render(list);
    })
    .catch(() => {
      showError('Не вижу images.json. Проверь, что он лежит в корне репозитория.');
    });
})();