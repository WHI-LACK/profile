/* ============================================================================
   main.js — the interaction layer.

   The whole site is three ideas, and everything below serves one of them:

     1. SCROLL IS THE CAMERA. One invisible DOM row per product gives the page
        its length. Row height and the 3D pitch are the same number, so the row
        you are pointing at is always the slab you are looking at.
     2. TWO COLOURS. Opening a book swaps --background / --color, which repaints
        the stage, the type, the rules and the SVG in one go.
     3. CLICK, DON'T NAVIGATE. Opening a product keeps you on the page, fades
        the details in, and records the slug with history.replaceState. The
        URL stays shareable, popstate still works.
   ========================================================================== */
window.PRESS = window.PRESS || {};
(function () {
  'use strict';

  var SITE = window.PRESS.SITE;
  var PRODUCTS = window.PRESS.PRODUCTS;
  var Covers = window.PRESS.Covers;
  var doc = document;
  var root = doc.documentElement;
  var N = PRODUCTS.length;
  var DEFAULT_THEME = { bg: '#201819', fg: '#ffffff' };

  /* ------------------------------------------------------------- helpers --- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function make(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function arrow(cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 9 9');
    if (cls) svg.setAttribute('class', cls);
    var p = doc.createElementNS(ns, 'path');
    p.setAttribute('d', 'M0.5 4.5h7.2M4.9 1.2l3.3 3.3-3.3 3.3');
    svg.appendChild(p);
    return svg;
  }
  function markCanvas(size, color) {
    var c = make('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    Covers.mark(ctx, size / 2, size / 2, size * 0.86, color);
    return c;
  }
  function diagnostics(title, detail) {
    var box = $('#diag');
    if (!box || box.dataset.shown === '1') return;
    box.dataset.shown = '1';
    box.hidden = false;
    $('#diag-body').textContent = title + '\n\n' + detail;
  }
  window.addEventListener('error', function (e) {
    diagnostics('A script error stopped part of the page.', (e.message || '') + '\n' + (e.filename || ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    diagnostics('A promise rejected.', String((e.reason && e.reason.message) || e.reason || ''));
  });

  /* -------------------------------------------------------------- state ---- */
  var state = {
    rowH: 200,
    topOffset: 0,         // px between the top of the document and the first row
    index: null,          // open product, or null while browsing
    scrollBefore: 0,
    gl: null,
    noGL: false,
    drag: null,
    players: {},          // episode index -> audio player
    waveRAF: 0,
    episode: null
  };

  /* ----------------------------------------------------------- viewport ---- */
  function updateViewport() {
    var vh = window.innerHeight / 100;
    var scrollbar = Math.max(0, window.innerWidth - doc.documentElement.clientWidth);
    root.style.setProperty('--vh', vh + 'px');
    root.style.setProperty('--windowWidth', (window.innerWidth - scrollbar) + 'px');
    var row = $('.Catalogue__row');
    var measured = row ? row.getBoundingClientRect().height : 0;
    // the rows are display:none while a product is open, so keep the last value
    if (measured > 1) state.rowH = measured;
    var cat = $('#catalogue');
    if (cat && cat.getBoundingClientRect().height > 1) {
      state.topOffset = Math.round(parseFloat(getComputedStyle(cat).paddingTop) || 0);
      if (state.gl) state.gl.setStageTop(state.topOffset / Math.max(1, window.innerHeight));
    }
    if (state.gl) {
      state.gl.resize();
      /* Keep the DOM row grid exactly on the 3D pitch: the camera pulls back on
         narrow canvases, so the row height has to shrink with it. */
      root.style.setProperty('--rowHeight', 'calc(var(--vh) * ' + (state.gl.rowFractionNow() * 100) + ')');
    }
  }

  /* ------------------------------------------------------- build: header --- */
  function buildIntro() {
    $('#intro-brand').textContent = SITE.brand;
    $('#intro-tagline').textContent = SITE.tagline;
  }

  /* ------------------------------------------ build: catalogue (hit rows) -- */
  function buildCatalogue() {
    var box = $('#catalogue');
    PRODUCTS.forEach(function (p, i) {
      var row = make('button', 'Catalogue__row Catalogue__row--' + p.kind);
      row.type = 'button';
      row.dataset.index = i;
      row.style.setProperty('--rowBackground', p.theme.bg);
      row.style.setProperty('--rowColor', p.theme.fg);
      row.setAttribute('aria-label', 'Open ' + p.title);

      var text = make('span', 'Catalogue__text');
      text.appendChild(make('span', 'Catalogue__title', p.title));
      text.appendChild(make('span', 'Catalogue__author', p.author || p.rowLabel || ''));
      row.appendChild(text);

      row.addEventListener('mouseenter', function () { if (state.gl) state.gl.setHover(i); });
      row.addEventListener('mouseleave', function () { if (state.gl) state.gl.setHover(null); });
      row.addEventListener('focus', function () { if (state.gl) state.gl.setHover(i); });
      row.addEventListener('blur', function () { if (state.gl) state.gl.setHover(null); });
      row.addEventListener('click', function () { openProduct(i); });
      box.appendChild(row);
    });
  }

  /* -------------------------------------------------- build: the details --- */
  function buyRow(label, href) {
    var a = make('a', 'Buy');
    a.href = href || '#';
    a.appendChild(make('span', 'Buy__bar'));
    a.appendChild(make('span', 'Buy__label', label));
    var icon = make('span', 'Buy__icon');
    var pair = make('span', 'Buy__iconPair');
    pair.appendChild(arrow('Buy__arrow'));
    pair.appendChild(arrow('Buy__arrowAlt'));
    icon.appendChild(pair);
    a.appendChild(icon);
    return a;
  }

  function linkGroup(links) {
    var group = make('div', 'LinkGroup');
    links.forEach(function (l) {
      var cell = make('span', 'LinkGroup__cell');
      var a = make('a', 'Link LinkGroup__link', l.label);
      a.href = l.href || '#';
      cell.appendChild(a);
      group.appendChild(cell);
    });
    return group;
  }

  function praiseList(p) {
    var wrap = make('div', 'PraiseList');
    wrap.appendChild(make('p', 'Label', 'Praise'));
    var grid = make('div', 'PraiseList__grid');
    (p.praise || []).forEach(function (q) {
      var item = make('div', 'Praise');
      item.appendChild(make('p', 'Praise__quote', q.body));
      item.appendChild(make('p', 'Praise__name', q.name));
      item.appendChild(make('p', 'Praise__role', q.role));
      grid.appendChild(item);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function bioBlock(p) {
    var box = make('div', 'Detail__bio Bio');
    box.appendChild(make('p', 'Label', 'About the author'));

    var plate = make('canvas', 'Bio__portrait');
    plate.width = 320; plate.height = 400;
    var ctx = plate.getContext('2d');
    ctx.fillStyle = p.cover.ink;
    ctx.fillRect(0, 0, 320, 400);
    ctx.fillStyle = p.cover.paper;
    ctx.font = Covers.serif('700', 96);
    ctx.textBaseline = 'middle';
    ctx.fillText((p.author || 'P S').split(/\s+/).map(function (w) { return w[0]; }).join(''), 30, 200);
    Covers.mark(ctx, 250, 320, 56, p.cover.paper);
    ctx.font = Covers.serif('400', 18);
    ctx.fillText('Paper & Signal', 30, 360);
    box.appendChild(plate);

    box.appendChild(make('p', null, p.authorBio || ''));
    return box;
  }

  function zineBlock(p) {
    var wrap = make('div', 'Zine');
    wrap.appendChild(make('p', 'Label', 'Zine'));
    var link = make('a', 'Zine__link');
    link.href = '#';
    var img = Covers.zine(p);
    img.className = 'Zine__img';
    link.appendChild(img);
    var cta = make('span', 'Zine__cta', 'Read the excerpt');
    cta.appendChild(arrow('Zine__icon'));
    link.appendChild(cta);
    wrap.appendChild(link);
    wrap.appendChild(make('p', 'Zine__caption', 'A printed excerpt, posted free with every order.'));
    return wrap;
  }

  function bookPanel(p) {
    var panel = make('div', 'Detail__panel');
    panel.style.setProperty('--cover', p.cover.ink);
    var info = make('div', 'Detail__info');
    var left = make('div', 'Detail__left');
    left.dataset.drag = '1';

    var right = make('div', 'Detail__right');
    right.appendChild(make('h2', 'Detail__title', p.title));
    right.appendChild(make('p', 'Detail__author', p.author));
    right.appendChild(make('span', 'Rule Detail__hr'));
    right.appendChild(make('p', 'Detail__lede', p.about));

    var buy = make('div', 'Detail__buyOptions');
    var group = make('div', 'BuyGroup');
    group.appendChild(make('p', 'BuyGroup__label', (p.buy && p.buy.label) || 'Buy the book'));
    ((p.buy && p.buy.links) || []).forEach(function (l) {
      group.appendChild(buyRow(l.label, l.href));
    });
    buy.appendChild(group);
    right.appendChild(buy);
    right.appendChild(bioBlock(p));

    info.appendChild(left);
    info.appendChild(right);
    panel.appendChild(info);
    panel.appendChild(praiseList(p));
    panel.appendChild(zineBlock(p));
    return panel;
  }

  function filmPanel(p) {
    var panel = make('div', 'Detail__panel Detail__panel--film');
    var info = make('div', 'Detail__info');

    var left = make('div', 'Detail__left');
    var poster = Covers.poster(p, 880, 520);
    poster.className = 'Detail__filmPoster';
    left.appendChild(poster);

    var right = make('div', 'Detail__right');
    right.appendChild(make('h2', 'Detail__title', p.title));
    right.appendChild(make('p', 'Detail__author', p.rowLabel));
    right.appendChild(make('span', 'Rule Detail__hr'));
    right.appendChild(make('p', 'Detail__lede', p.synopsis));

    var watch = buyRow('Watch the film', '#watch-film');
    watch.addEventListener('click', function (e) { e.preventDefault(); openFilm(); });
    var group = make('div', 'BuyGroup');
    group.appendChild(watch);
    var buy = make('div', 'Detail__buyOptions');
    buy.appendChild(group);
    right.appendChild(buy);

    var credits = make('dl', 'Credits');
    (p.credits || []).forEach(function (c) {
      credits.appendChild(make('dt', null, c[0]));
      credits.appendChild(make('dd', null, c[1]));
    });
    var creditsBlock = make('div', 'Detail__bio');
    creditsBlock.appendChild(make('p', 'Label', 'Credits'));
    creditsBlock.appendChild(credits);
    right.appendChild(creditsBlock);

    info.appendChild(left);
    info.appendChild(right);
    panel.appendChild(info);

    var tracks = make('div', 'PraiseList');
    tracks.appendChild(make('p', 'Label', 'Score'));
    var list = make('ol', 'Tracks');
    (p.score || []).forEach(function (t) {
      var li = make('li', 'Track');
      li.appendChild(make('span', 'Track__name', t.name));
      li.appendChild(make('span', 'Track__dots'));
      li.appendChild(make('span', 'Track__length', t.length));
      list.appendChild(li);
    });
    tracks.appendChild(list);
    panel.appendChild(tracks);

    var reviews = make('div', 'PraiseList');
    reviews.appendChild(make('p', 'Label', 'Reviews'));
    var grid = make('div', 'PraiseList__grid');
    (p.reviews || []).forEach(function (r) {
      var item = make('div', 'Review');
      item.appendChild(make('p', 'Review__quote', r.body));
      item.appendChild(make('p', 'Review__publication', r.publication));
      item.appendChild(make('p', 'Review__author', r.author));
      grid.appendChild(item);
    });
    reviews.appendChild(grid);
    panel.appendChild(reviews);
    return panel;
  }

  function episodeBlock(ep, i) {
    var item = make('div', 'Episode' + (ep.published ? ' Episode--published' : ''));
    var eyebrow = make('button', 'Episode__eyebrow');
    eyebrow.type = 'button';
    eyebrow.setAttribute('aria-expanded', 'false');
    var title = make('span', null, ep.title);
    eyebrow.appendChild(title);
    eyebrow.appendChild(make('span', null, ep.duration || ''));
    eyebrow.appendChild(make('span', 'Episode__plus'));
    item.appendChild(eyebrow);

    var body = make('div', 'Episode__body');
    if (ep.body) body.appendChild(make('p', 'Episode__summary', ep.body));
    if (ep.notes) body.appendChild(make('p', 'Episode__notes', ep.notes));

    if (ep.guests && ep.guests.length) {
      var guests = make('ul', 'Episode__guests');
      ep.guests.forEach(function (g) {
        var li = make('li');
        li.appendChild(make('span', 'Episode__guestName', g[0]));
        li.appendChild(make('span', 'Episode__guestRole', ' — ' + g[1]));
        guests.appendChild(li);
      });
      body.appendChild(guests);
    }

    if (ep.published) {
      var audio = make('div', 'Episode__audio');
      var play = make('button', 'Episode__play');
      play.type = 'button';
      play.textContent = ep.audio ? 'Play episode' : 'Play preview';
      if (!ep.audio) play.title = 'No audio file wired up yet — this is a generated tone.';
      var wave = make('canvas', 'Episode__wave');
      wave.width = 520; wave.height = 50;
      var time = make('span', 'Episode__time', '0:00');
      audio.appendChild(play);
      audio.appendChild(wave);
      audio.appendChild(time);
      body.appendChild(audio);

      play.addEventListener('click', function () { toggleEpisode(i, ep, play, wave, time); });

      if (ep.transcript) {
        var link = make('button', 'TranscriptLink');
        link.type = 'button';
        link.textContent = 'Read the transcript';
        link.addEventListener('click', function () { openTranscript(ep); });
        body.appendChild(link);
      }
    } else {
      body.appendChild(make('p', 'Episode__notes', 'Not published yet.'));
    }

    item.appendChild(body);
    eyebrow.addEventListener('click', function () {
      var open = item.classList.toggle('is-expanded');
      eyebrow.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    return item;
  }

  function podcastPanel(p) {
    var panel = make('div', 'Detail__panel Detail__panel--podcast');
    var info = make('div', 'Detail__info');
    var left = make('div', 'Detail__left');
    var cover = Covers.poster(p, 720, 720);
    cover.className = 'Detail__filmPoster';
    left.appendChild(cover);

    var right = make('div', 'Detail__right');
    right.appendChild(make('h2', 'Detail__title', p.title));
    right.appendChild(make('p', 'Detail__author', p.subtitle));
    right.appendChild(make('span', 'Rule Detail__hr'));
    right.appendChild(make('p', 'Detail__lede', p.about));
    info.appendChild(left);
    info.appendChild(right);
    panel.appendChild(info);

    var seasons = make('div', 'PraiseList');
    (p.seasons || []).forEach(function (season) {
      seasons.appendChild(make('p', 'Season', season.name));
      var list = make('div', 'Episodes');
      season.episodes.forEach(function (ep, i) {
        list.appendChild(episodeBlock(ep, season.name + '-' + i));
      });
      seasons.appendChild(list);
    });
    panel.appendChild(seasons);
    return panel;
  }

  function buildDetails() {
    var box = $('#details');
    PRODUCTS.forEach(function (p, i) {
      var sec = make('section', 'Detail');
      sec.dataset.index = i;
      sec.id = 'detail-' + p.slug;
      sec.setAttribute('aria-label', p.title);
      try {
        sec.appendChild(p.kind === 'film' ? filmPanel(p) : p.kind === 'podcast' ? podcastPanel(p) : bookPanel(p));
      } catch (err) {
        // one broken product must not take the catalogue down
        diagnostics('Could not build the panel for "' + p.title + '".', String(err && err.message || err));
        sec.appendChild(make('div', 'Detail__panel'));
      }
      box.appendChild(sec);
    });

    // dragging the left stage spins the book around, with inertia
    box.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('[data-drag]')) return;
      state.drag = { x: e.clientX, y: e.clientY };
      root.classList.add('is-dragging');
      if (state.gl) state.gl.setDragging(true);
    });
    window.addEventListener('pointermove', function (e) {
      if (!state.drag) return;
      var dx = e.clientX - state.drag.x;
      var dy = e.clientY - state.drag.y;
      state.drag.x = e.clientX;
      state.drag.y = e.clientY;
      if (state.gl) state.gl.spin(dx, dy);
    });
    window.addEventListener('pointerup', function () {
      if (!state.drag) return;
      state.drag = null;
      root.classList.remove('is-dragging');
      if (state.gl) state.gl.setDragging(false);
    });
  }

  /* ------------------------------------------------------ build: the menu -- */
  function buildMenu() {
    $('#menu-backLabel').textContent = SITE.nav.back;
    $('#menu-filmLabel').textContent = SITE.nav.film;
    $('#menu-podcastLabel').textContent = SITE.nav.podcast;
    $('#menu-aboutLabel').textContent = SITE.controlPanel.title;

    var ruler = $('#ruler');
    PRODUCTS.forEach(function (p, i) {
      var item = make('li');
      var btn = make('button', 'Ruler__item');
      btn.type = 'button';
      btn.dataset.index = i;
      btn.setAttribute('aria-label', p.title);
      var bar = make('span', 'Ruler__bar');
      btn.appendChild(bar);
      btn.appendChild(make('span', 'Ruler__label', p.title));
      btn.addEventListener('mouseenter', function () { if (state.gl) state.gl.setHover(i); });
      btn.addEventListener('click', function () { gotoProduct(i); });
      item.appendChild(btn);
      ruler.appendChild(item);
    });

    $('#menu-logo').addEventListener('click', function () {
      if (state.index !== null) closeProduct();
      else scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    });
    $('#menu-back').addEventListener('click', closeProduct);
    $('#menu-film').addEventListener('click', function () {
      var idx = PRODUCTS.findIndex(function (p) { return p.kind === 'film'; });
      if (idx > -1) { gotoProduct(idx); openFilm(); }
    });
    $('#menu-podcast').addEventListener('click', function () {
      var idx = PRODUCTS.findIndex(function (p) { return p.kind === 'podcast'; });
      if (idx > -1) gotoProduct(idx);
    });
    $('#menu-about').addEventListener('click', togglePanel);
  }

  function updateRuler(progress) {
    $$('.Ruler__item').forEach(function (btn) {
      var i = Number(btn.dataset.index);
      btn.classList.toggle('is-past', i < progress - 0.5);
      btn.classList.toggle('is-active', Math.abs(i - progress) <= 0.5);
    });
  }

  /* -------------------------------------------------- build: end panel ----- */
  function buildInfo() {
    $('#info-heading').textContent = SITE.footer.heading;
    var copy = $('#info-copy');
    copy.appendChild(make('p', null, SITE.intro.lead));
    copy.appendChild(make('p', null, SITE.intro.body));
    $('#info-signup').textContent = SITE.intro.signup;

    var note = $('#info-note');
    note.appendChild(doc.createTextNode(SITE.footer.note));
    var privacy = make('a', null, SITE.footer.privacy);
    privacy.href = '#';
    note.appendChild(privacy);
    note.appendChild(doc.createTextNode('.'));

    var social = $('#info-social');
    SITE.footer.social.forEach(function (s) {
      var a = make('a', 'Info__socialIcon');
      a.href = s.href;
      a.setAttribute('aria-label', s.label);
      a.appendChild(markCanvas(22, '#000'));
      social.appendChild(a);
    });

    var legal = $('#info-legal');
    legal.appendChild(make('p', null, '© ' + new Date().getFullYear() + ' Paper & Signal'));
    var contact = make('p');
    var mail = make('a', null, SITE.footer.contact);
    mail.href = 'mailto:' + SITE.footer.contact;
    contact.appendChild(mail);
    legal.appendChild(contact);

    $('#info-close').addEventListener('click', function () {
      scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    });

    var form = $('#signup');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#signup-email');
      var msg = $('#signup-msg');
      msg.className = 'Signup__msg';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        msg.classList.add('is-error');
        msg.textContent = 'That does not look like an email address.';
        input.focus();
        return;
      }
      if (SITE.signupEndpoint) {
        fetch(SITE.signupEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value })
        }).then(function () {
          msg.classList.add('is-success');
          msg.textContent = 'Thank you — please confirm via the email we just sent.';
          form.reset();
        }).catch(function () {
          msg.classList.add('is-error');
          msg.textContent = 'Could not reach the list. Try again later.';
        });
      } else {
        msg.classList.add('is-success');
        msg.textContent = 'Demo form: nothing was sent. Add SITE.signupEndpoint in js/content.js.';
      }
    });
  }

  /* ------------------------------------------------------ build: the film -- */
  function buildFilm() {
    var film = PRODUCTS.filter(function (p) { return p.kind === 'film'; })[0];
    if (!film) return;
    $('#film-title').textContent = film.title;
    $('#film-subtitle').textContent = film.rowLabel || '';
    $('#film-synopsis').textContent = film.synopsis || '';

    var credits = $('#film-credits');
    (film.credits || []).forEach(function (c) {
      credits.appendChild(make('dt', null, c[0]));
      credits.appendChild(make('dd', null, c[1]));
    });
    var tracks = $('#film-tracks');
    (film.score || []).forEach(function (t) {
      var li = make('li', 'Track');
      li.appendChild(make('span', 'Track__name', t.name));
      li.appendChild(make('span', 'Track__dots'));
      li.appendChild(make('span', 'Track__length', t.length));
      tracks.appendChild(li);
    });
    var reviews = $('#film-reviews');
    (film.reviews || []).forEach(function (r) {
      var item = make('div', 'Review');
      item.appendChild(make('p', 'Review__quote', r.body));
      item.appendChild(make('p', 'Review__publication', r.publication));
      item.appendChild(make('p', 'Review__author', r.author));
      reviews.appendChild(item);
    });
    var ticker = $('#film-tickerText');
    ticker.textContent = (film.ticker || '') + (film.ticker || '');

    var poster = Covers.poster(film, 1280, 900);
    $('#film-poster').style.backgroundImage = 'url(' + poster.toDataURL('image/png') + ')';
    $('#stage-backdrop').style.backgroundImage = 'url(' + Covers.poster(film, 700, 700).toDataURL('image/png') + ')';

    $('#film-back').addEventListener('click', closeFilm);
    $('#film-play').addEventListener('click', function () {
      if (state.filmPlaying) { stopTrailer(); } else { startTrailer(); }
    });
    $('#film-ticker').addEventListener('click', function (e) {
      e.preventDefault();
      closeFilm();
    });
  }

  var trailerRAF = 0;
  function startTrailer() {
    var canvas = $('#film-canvas');
    var w = canvas.width = canvas.clientWidth || 1280;
    var h = canvas.height = canvas.clientHeight || 720;
    var ctx = canvas.getContext('2d');
    var stars = [];
    for (var i = 0; i < 260; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, z: 0.2 + Math.random() * 0.9 });
    }
    var t0 = performance.now();
    state.filmPlaying = true;
    $('#film-playLabel').textContent = 'Pause';
    (function loop(now) {
      if (!state.filmPlaying) return;
      var t = (now - t0) / 1000;
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, w, h);
      stars.forEach(function (s) {
        var y = s.y + Math.sin(t * 0.4 + s.z * 6) * 6;
        ctx.globalAlpha = 0.25 + s.z * 0.7;
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.x, y, s.z * 1.6, s.z * 1.6);
      });
      ctx.globalAlpha = 1;
      var wave = h * 0.78;
      ctx.strokeStyle = 'rgba(255,217,67,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 10) {
        var yy = wave + Math.sin(x / 90 + t * 0.7) * 22 + Math.sin(x / 31 - t * 0.3) * 8;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      var fade = Math.min(1, t / 2);
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ffd943';
      ctx.font = Covers.serif('700', Math.round(w * 0.05));
      var film = PRODUCTS.filter(function (p) { return p.kind === 'film'; })[0];
      ctx.fillText(film.title, w * 0.06, h * 0.5 + Math.sin(t) * 4);
      ctx.globalAlpha = 1;
      trailerRAF = requestAnimationFrame(loop);
    })(performance.now());
  }
  function stopTrailer() {
    state.filmPlaying = false;
    cancelAnimationFrame(trailerRAF);
    $('#film-playLabel').textContent = 'Play trailer';
    var canvas = $('#film-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }
  function openFilm() {
    var el = $('#film');
    el.hidden = false;
    el.scrollTop = 0;
    root.classList.add('is-film');
    $('#film-back').focus();
  }
  function closeFilm() {
    stopTrailer();
    $('#film').hidden = true;
    root.classList.remove('is-film');
    if (state.index !== null) $('#menu-back').focus();
  }

  /* ---------------------------------------------- build: transcript view --- */
  function buildTranscript() {
    $('#transcript-back').addEventListener('click', closeTranscript);
    $('#transcript').addEventListener('scroll', function () {
      var t = $('#transcript');
      var max = t.scrollHeight - t.clientHeight;
      $('#transcript-fill').style.width = (max > 0 ? (t.scrollTop / max) * 100 : 0) + '%';
    }, { passive: true });
  }
  function openTranscript(ep) {
    var body = $('#transcript-body');
    body.textContent = '';
    $('#transcript-title').textContent = ep.title;
    (ep.transcript || []).forEach(function (line) {
      var p = make('p');
      p.appendChild(make('span', 'Transcript__who', line.who + ': '));
      p.appendChild(doc.createTextNode(line.text));
      body.appendChild(p);
    });
    $('#transcript').hidden = false;
    $('#transcript').scrollTop = 0;
    root.classList.add('is-transcript');
    $('#transcript-back').focus();
  }
  function closeTranscript() {
    $('#transcript').hidden = true;
    root.classList.remove('is-transcript');
    if (state.index !== null) $('#menu-back').focus();
  }

  /* -------------------------------------------------- build: stage panel --- */
  function buildPanel() {
    $('#panel').hidden = false;          // off-canvas via transform, so it can animate
    $('#panel-title').textContent = SITE.controlPanel.title;
    var box = $('#panel-content');
    var hint = make('p', 'Panel__hint', SITE.controlPanel.hint);
    hint.style.cssText = 'font-size:13px;opacity:.7;margin-bottom:18px';
    box.appendChild(hint);

    var groups = {
      'Camera': [
        ['fov', 'Lens (fov°)', 8, 24, 0.5],
        ['elevation', 'Elevation°', 2, 20, 0.5],
        ['distance', 'Distance', 4, 10, 0.05],
        ['rowFraction', 'Row / slab pitch', 0.15, 0.40, 0.005]
      ],
      'Stack': [
        ['step', 'Depth step', 0, 0.4, 0.01],
        ['hoverLift', 'Hover lift', 0, 0.12, 0.005],
        ['fog', 'Fog', 0, 0.2, 0.002]
      ],
      'Active book': [
        ['detailScale', 'Scale', 0.15, 0.8, 0.01],
        ['detailRotX', 'Lean', -1.57, 1.57, 0.02],
        ['detailRotY', 'Turn', -1.2, 1.2, 0.02]
      ]
    };

    Object.keys(groups).forEach(function (name) {
      var group = make('div', 'Panel__group');
      group.appendChild(make('h4', null, name));
      groups[name].forEach(function (spec) {
        var key = spec[0], label = spec[1], min = spec[2], max = spec[3], step = spec[4];
        var wrapEl = make('div', 'Panel__slider');
        var lab = make('label');
        lab.appendChild(doc.createTextNode(label + ' '));
        var out = make('span', null, String(current(key)));
        lab.appendChild(out);
        if (label === 'Row / slab pitch') {
          lab.style.fontWeight = '600';
          lab.title = 'Also updates --rowHeight so the DOM rows stay aligned with the slabs.';
        }
        var input = make('input');
        input.type = 'range';
        input.min = min; input.max = max; input.step = step;
        input.value = current(key);
        input.addEventListener('input', function () {
          var v = parseFloat(input.value);
          out.textContent = String(v);
          applyParam(key, v);
        });
        wrapEl.appendChild(lab);
        wrapEl.appendChild(input);
        group.appendChild(wrapEl);
      });
      box.appendChild(group);
    });

    $('#panel-close').addEventListener('click', closePanel);
    $('#panel-copy').textContent = SITE.controlPanel.copy;
    $('#panel-copy').addEventListener('click', function () {
      var json = JSON.stringify(collectParams(), null, 2);
      var done = function () {
        $('#panel-copy').textContent = 'Copied';
        setTimeout(function () { $('#panel-copy').textContent = SITE.controlPanel.copy; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(done, function () { diagnostics('Clipboard blocked', json); });
      } else {
        diagnostics('Clipboard unavailable — values below', json);
      }
    });
  }

  var PARAM_KEYS = ['fov', 'elevation', 'distance', 'rowFraction', 'step', 'hoverLift', 'fog',
    'detailScale', 'detailRotX', 'detailRotY'];
  function current(key) {
    return state.gl ? state.gl.params[key] : 0;
  }
  function applyParam(key, value) {
    if (!state.gl) return;
    state.gl.params[key] = value;
    if (key === 'rowFraction') {
      updateViewport();
    }
  }
  function collectParams() {
    var out = {};
    PARAM_KEYS.forEach(function (k) { out[k] = state.gl ? state.gl.params[k] : null; });
    return out;
  }
  function togglePanel() {
    var panel = $('#panel');
    var open = panel.classList.toggle('is-open');
    panel.hidden = false;
    $('#menu-about').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) $('#panel-close').focus();
  }
  function closePanel() {
    $('#panel').classList.remove('is-open');
    $('#menu-about').setAttribute('aria-expanded', 'false');
    $('#menu-about').focus();
  }

  /* ----------------------------------------------------- build: new card --- */
  function buildNewCard() {
    $('#newcard-title').textContent = SITE.newCard.title;
    $('#newcard-sub').textContent = SITE.newCard.sub;
    var cta = $('#newcard-cta');
    cta.textContent = SITE.newCard.cta;
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      var idx = PRODUCTS.findIndex(function (p) { return p.slug === (SITE.newCard.slug || null); });
      if (idx > -1) openProduct(idx);
      dismissCard();
    });
    $('#newcard-dismiss').textContent = SITE.newCard.dismiss;
    $('#newcard-dismiss').addEventListener('click', dismissCard);
    if (!reduced()) {
      setTimeout(function () { $('#newcard').hidden = false; }, 2600);
    }
  }
  function dismissCard() {
    var card = $('#newcard');
    card.classList.add('is-closing');
    setTimeout(function () { card.hidden = true; }, 320);
  }

  /* ----------------------------------------------------------- the stage --- */
  function initStage() {
    var canvas = $('#stage-canvas');
    try {
      state.gl = window.PRESS.GL.create(canvas, PRODUCTS, {});
    } catch (e) {
      diagnostics('The 3D stage could not start.', String(e && e.message || e));
      state.gl = null;
    }
    if (!state.gl) {
      state.noGL = true;
      root.classList.add('is-nogl');
      return;
    }
    updateTheme(null);
    state.gl.start();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        syncScroll();
      });
    }, { passive: true });

    window.addEventListener('resize', function () { updateViewport(); });
    window.addEventListener('orientationchange', function () { updateViewport(); });
  }

  function syncScroll() {
    if (!state.gl) return;
    if (state.index !== null) {          // details are open: the stack is parked
      state.gl.setProgress(state.index);
      return;
    }
    var p = clamp((window.scrollY - state.topOffset) / Math.max(1, state.rowH), 0, N - 1);
    state.gl.setProgress(p);
    updateRuler(p);
  }

  /* --------------------------------------------------------- open / close --- */
  function updateTheme(p) {
    var theme = p ? p.theme : DEFAULT_THEME;
    root.style.setProperty('--background', theme.bg);
    root.style.setProperty('--color', theme.fg);
    root.style.setProperty('--gradient', theme.gradient || 'none');
    if (state.gl) state.gl.setBackground(theme.bg);
  }

  /* Deep links live in the hash (#/the-long-middle). That keeps them working on
     any static host — including a GitHub Pages project sub-path — with no server
     rewrite rules, and a refresh never 404s. */
  function hashFor(p) { return '#/' + p.slug; }
  function setURL(hash) {
    try {
      if (window.location.protocol === 'file:') return;   // file:// forbids this
      var base = window.location.pathname + window.location.search;
      window.history.replaceState({ product: hash || null }, '', hash ? base + hash : base);
    } catch (e) { /* ignore */ }
  }

  function openProduct(i, opts) {
    opts = opts || {};
    var p = PRODUCTS[i];
    if (!p) return;

    if (state.index === null) state.scrollBefore = window.scrollY;
    state.index = i;

    updateTheme(p);
    root.classList.add('is-product');
    root.dataset.state = 'product';
    root.classList.toggle('is-filmPoster', p.kind === 'film');

    $$('.Detail').forEach(function (d) {
      d.classList.toggle('is-active', Number(d.dataset.index) === i);
    });
    $$('.Catalogue__row').forEach(function (r) {
      if (Number(r.dataset.index) === i) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
    });

    if (state.gl) {
      state.gl.setHover(null);
      state.gl.jumpTo(i);
      state.gl.setActive(i);
    }
    updateRuler(i);
    setURL(hashFor(p));

    window.scrollTo({ top: 0, behavior: (opts.instant || reduced()) ? 'auto' : 'smooth' });
    if (!opts.silent) {
      setTimeout(function () { $('#menu-back').focus({ preventScroll: true }); }, 60);
    }
  }

  function closeProduct() {
    if (state.index === null) return;
    var i = state.index;
    state.index = null;

    root.classList.remove('is-product', 'is-filmPoster');
    root.dataset.state = 'list';
    $$('.Detail').forEach(function (d) { d.classList.remove('is-active'); });
    updateTheme(null);
    if (state.gl) {
      state.gl.setActive(null);
      state.gl.jumpTo(i);
    }
    setURL(null);
    updateViewport();                    // rows are measurable again
    window.scrollTo({ top: state.scrollBefore, behavior: 'auto' });
    syncScroll();
    var row = $('.Catalogue__row[data-index="' + i + '"]');
    if (row) row.focus({ preventScroll: true });
  }

  /* Jump to a product: scroll to its row while browsing, open it otherwise */
  function gotoProduct(i) {
    if (state.index !== null) { openProduct(i); return; }
    window.scrollTo({
      top: state.topOffset + i * state.rowH,
      behavior: reduced() ? 'auto' : 'smooth'
    });
  }

  /* ----------------------------------------------------- podcast playback --- */
  function toggleEpisode(id, ep, button, canvas, time) {
    var player = state.players[id];
    if (player && player.isPlaying()) {
      player.pause();
      button.textContent = ep.audio ? 'Play episode' : 'Play preview';
      stopWave();
      return;
    }
    if (!player) {
      player = window.PRESS.Audio.create(ep.audio);
      if (!player) {
        diagnostics('Audio is unavailable in this browser.', 'The Web Audio API could not be started.');
        return;
      }
      state.players[id] = player;
    }
    Object.keys(state.players).forEach(function (k) {
      if (k !== id) {
        state.players[k].pause();
        $$('.Episode__play').forEach(function (b) {
          if (b !== button) b.textContent = 'Play preview';
        });
      }
    });
    player.play();
    button.textContent = 'Pause';
    startWave(player, canvas, time);
  }

  function startWave(player, canvas, timeEl) {
    stopWave();
    var ctx = canvas.getContext('2d');
    var data = new Uint8Array(player.analyser.fftSize);
    var w = canvas.width, h = canvas.height;
    (function draw() {
      player.levels(data);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(root).getPropertyValue('--color').trim() || '#fff';
      var bars = 96;
      var step = Math.floor(data.length / bars) || 1;
      var bw = w / bars;
      for (var i = 0; i < bars; i++) {
        var v = (data[i * step] - 128) / 128;
        var bh = Math.max(2, Math.abs(v) * h * 1.1);
        ctx.fillRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh);
      }
      var secs = Math.floor(player.elapsed());
      timeEl.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      if (player.isPlaying()) state.waveRAF = requestAnimationFrame(draw);
    })();
  }
  function stopWave() { cancelAnimationFrame(state.waveRAF); }

  /* ----------------------------------------------------------- boot ------ */
  function boot() {
    root.dataset.state = 'list';
    doc.body.classList.add('KeyboardNav');
    buildIntro();
    buildCatalogue();
    buildDetails();
    buildMenu();
    buildInfo();
    buildFilm();
    buildTranscript();
    buildNewCard();

    updateViewport();
    initStage();
    updateViewport();       // rowH depends on the CSS variable --vh being set
    buildPanel();           // the sliders read live values from the stage

    // keyboard = keyboard only focus rings
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') doc.body.classList.add('KeyboardNav');
    });
    window.addEventListener('mousedown', function () { doc.body.classList.remove('KeyboardNav'); });

    // placeholder links (#) would otherwise jump the page to the top
    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href="#"]') : null;
      if (a) e.preventDefault();
    });

    window.addEventListener('popstate', function () {
      if (state.index !== null) closeProduct();
    });
    // deep links can also arrive as hash changes (copy/paste, browser back)
    window.addEventListener('hashchange', function () {
      var want = (window.location.hash || '').replace(/^#\/?/, '');
      var i = PRODUCTS.findIndex(function (p) { return p.slug === want; });
      if (i > -1) {
        if (state.index !== i) openProduct(i, { instant: true, silent: true });
      } else if (state.index !== null && want.indexOf('catalogue') !== 0) {
        closeProduct();
      }
    });

    // Deep links: #/slug, or a rewritten /slug path when the host supports it.
    // Works from a sub-path too: /profile/#/the-long-middle
    var rawHash = (window.location.hash || '').replace(/^#\/?/, '');
    var lastPath = window.location.pathname.replace(/\/+$/, '').split('/').pop();
    var wanted = PRODUCTS.some(function (p) { return p.slug === rawHash; }) ? rawHash : lastPath;
    var idx = PRODUCTS.findIndex(function (p) { return p.slug === wanted; });
    if (idx > -1) {
      window.scrollTo(0, state.topOffset + idx * state.rowH);
      openProduct(idx, { instant: true, silent: true });
    } else {
      syncScroll();
    }

    root.classList.add('is-ready');
    if (reduced() && state.gl) state.gl.advance(240);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
