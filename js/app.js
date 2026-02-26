(() => {
  const grid = document.getElementById('grid');
  const statusEl = document.getElementById('status');

  const viewer = document.getElementById('viewer');
  const viewerImg = document.getElementById('viewerImg');
  const viewerCaption = document.getElementById('viewerCaption');

  let items = [];
  let current = -1;

  const cleanCaption = (name) => {
    // превращаем "01_sunset-2026.webp" -> "01 sunset 2026"
    return name
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  };

  const openViewer = (index) => {
    current = index;
    const it = items[current];
    viewerImg.src = it.full;
    viewerImg.alt = it.caption;
    viewerCaption.textContent = it.caption;

    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeViewer = () => {
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    viewerImg.src = '';
    current = -1;
  };

  const nav = (dir) => {
    if (current < 0) return;
    const next = (dir === 'next')
      ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
    openViewer(next);
  };

  const render = (list) => {
    items = list.map((name) => ({
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
  };

  const showError = (msg) => {
    statusEl.textContent = msg;
    statusEl.hidden = false;
    grid.hidden = true;
  };

  // close / nav handlers
  viewer.addEventListener('click', (e) => {
    const close = e.target && e.target.dataset && e.target.dataset.close;
    const navDir = e.target && e.target.dataset && e.target.dataset.nav;
    if (close) closeViewer();
    if (navDir) nav(navDir);
  });

  window.addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') nav('next');
    if (e.key === 'ArrowLeft') nav('prev');
  });

  // load manifest
  fetch('images.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('images.json not found')))
    .then(list => {
      if (!Array.isArray(list) || list.length === 0) {
        showError('images.json пустой. Закинь картинки в img/ и обнови images.json.');
        return;
      }
      render(list);
    })
    .catch(() => {
      showError('Не вижу images.json. Сейчас это нормально — сначала закинь картинки и сгенерь список.');
    });
})();