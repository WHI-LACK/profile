/* ============================================================================
   sheet.js — the A4 one-sheet template.

   One page per product, built from the same data and the same artwork code as
   the site, so editing js/content.js updates both. Open print.html, pick a
   title (or show every page) and print / save as PDF:

     A4 portrait · margins: none · background graphics: on
   ========================================================================== */
(function () {
  'use strict';

  var SITE = window.PRESS.SITE;
  var PRODUCTS = window.PRESS.PRODUCTS;
  var Covers = window.PRESS.Covers;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var SITE_URL = 'https://whi-lack.github.io/profile/';
  var QR_SRC = 'docs/qr-live-site.png';   // generated earlier, points at SITE_URL
  var SQUASH = 0.58;                      // cover foreshortening, as in the stack view
  var SCALE = 2;                          // draw the slab at 2x so it prints crisp

  var KIND_LABEL = { book: 'Book', film: 'Film', podcast: 'Podcast' };

  /* ------------------------------------------------------------- helpers --- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function markSVG() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'Mark');
    svg.setAttribute('viewBox', '0 0 44 56');
    svg.setAttribute('aria-hidden', 'true');
    [[22, 28, 17], [22, 28, 11], [22, 28, 5]].forEach(function (c) {
      var circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', 'Mark__arc');
      circle.setAttribute('cx', c[0]);
      circle.setAttribute('cy', c[1]);
      circle.setAttribute('r', c[2]);
      svg.appendChild(circle);
    });
    var dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'Mark__dot');
    dot.setAttribute('cx', '31');
    dot.setAttribute('cy', '39');
    dot.setAttribute('r', '2.2');
    svg.appendChild(dot);
    return svg;
  }

  function arrowSVG() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'Buy__arrow');
    svg.setAttribute('viewBox', '0 0 9 9');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M0.5 4.5h7.2M4.9 1.2l3.3 3.3-3.3 3.3');
    svg.appendChild(p);
    return svg;
  }

  /* The slab: the cover artwork foreshortened, with the printed band under it —
     the same silhouette the stack uses on screen. ---------------------------- */
  function slab(p) {
    var cover = Covers.front(p);          // 448 x 644
    var band = Covers.band(p);            // 1024 x 154
    var w = cover.width;
    var coverH = Math.round(cover.height * SQUASH);
    var bandH = Math.round(w * band.height / band.width);

    var c = document.createElement('canvas');
    c.width = w * SCALE;
    c.height = (coverH + bandH) * SCALE;
    var ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.drawImage(cover, 0, 0, cover.width, cover.height, 0, 0, w, coverH);
    ctx.drawImage(band, 0, 0, band.width, band.height, 0, coverH, w, bandH);
    return c;
  }

  /* ------------------------------------------------------------- the sheet -- */
  function sheetFor(p, index) {
    var sheet = el('section', 'Sheet');
    sheet.style.setProperty('--bg', p.theme.bg);
    sheet.style.setProperty('--fg', p.theme.fg);
    sheet.appendChild(el('div', 'Sheet__pages', (index + 1) + ' / ' + PRODUCTS.length));

    /* header */
    var head = el('header', 'Head');
    var brand = el('div', 'Head__brand');
    brand.appendChild(markSVG());
    var names = el('div', 'Head__names');
    names.appendChild(el('span', 'Head__name', SITE.brand));
    names.appendChild(el('span', 'Head__tagline', SITE.tagline));
    brand.appendChild(names);
    head.appendChild(brand);
    head.appendChild(el('div', 'Head__kicker', KIND_LABEL[p.kind] || 'Title'));
    sheet.appendChild(head);

    /* the book itself */
    var stage = el('div', 'Stage');
    var box = el('div', 'Slab');
    box.appendChild(slab(p));
    stage.appendChild(box);
    sheet.appendChild(stage);

    /* copy */
    var copy = el('div', 'Copy');
    copy.appendChild(el('h1', 'Copy__title', p.title));
    copy.appendChild(el('p', 'Copy__author', p.author || p.rowLabel || ''));
    copy.appendChild(el('span', 'Copy__rule'));
    copy.appendChild(el('p', 'Copy__blurb', p.about || p.synopsis || ''));

    if (p.facts && p.facts.length) {
      var dl = el('dl', 'Copy__meta');
      p.facts.forEach(function (f) {
        var cell = el('div');
        cell.appendChild(el('dt', null, f[0]));
        cell.appendChild(el('dd', null, f[1]));
        dl.appendChild(cell);
      });
      copy.appendChild(dl);
    }

    var links = (p.buy && p.buy.links) || null;
    if (links && links.length) {
      var buy = el('div', 'Buy');
      links.forEach(function (l) {
        var cell = el('span', 'Buy__cell');
        cell.appendChild(el('span', null, l.label));
        cell.appendChild(arrowSVG());
        buy.appendChild(cell);
      });
      copy.appendChild(buy);
    }
    sheet.appendChild(copy);

    /* footer */
    var foot = el('footer', 'Foot');
    var left = el('div');
    left.appendChild(el('div', 'Foot__address', SITE_URL.replace(/^https?:\/\//, '')));
    left.appendChild(el('p', 'Foot__note',
      'This sheet points at the online catalogue. ' + p.title + ': ' +
      SITE_URL.replace(/^https?:\/\//, '') + '#/' + p.slug));
    foot.appendChild(left);

    var qr = el('div', 'Qr');
    var qrBox = el('div', 'Qr__box');
    var img = document.createElement('img');
    img.src = QR_SRC;
    img.alt = 'Scan for the catalogue';
    qrBox.appendChild(img);
    qr.appendChild(qrBox);
    var label = el('div', 'Qr__label', '扫码看全部书目');
    label.appendChild(el('small', null, 'Scan for the full catalogue'));
    qr.appendChild(label);
    foot.appendChild(qr);
    sheet.appendChild(foot);

    return sheet;
  }

  /* --------------------------------------------------------------- chrome --- */
  /* screen-only fit-to-width: the sheet keeps its true A4 size when printed */
  function fitScreen() {
    var host = document.getElementById('sheets');
    if (!host) return;
    /* CSS mm is defined as exactly 96/25.4 px, so A4 is 793.7px wide here */
    var sheetW = 210 * 96 / 25.4;
    var sheetH = 296 * 96 / 25.4;
    var availW = document.documentElement.clientWidth - 48;
    var availH = window.innerHeight - 120;          // leave room for the toolbar
    var fit = Math.min(1, availW / sheetW, availH / sheetH);
    if (!host.firstElementChild) fit = 1;
    document.documentElement.style.setProperty('--fit', fit.toFixed(3));
  }

  function render(picked) {
    var host = document.getElementById('sheets');
    host.textContent = '';
    var list = picked === 'all' ? PRODUCTS : [PRODUCTS[picked]];
    list.forEach(function (p) {
      var index = PRODUCTS.indexOf(p);
      host.appendChild(sheetFor(p, index));
    });
    document.getElementById('count').textContent =
      picked === 'all' ? '共 ' + PRODUCTS.length + ' 页' : '第 ' + (picked + 1) + ' 本 / 共 ' + PRODUCTS.length;
    fitScreen();
  }

  function boot() {
    var picker = document.getElementById('picker');
    var fromHash = (window.location.hash || '').replace(/^#\/?/, '');
    var start = 0;
    PRODUCTS.forEach(function (p, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = p.title + '  ·  ' + (p.author || p.rowLabel || '');
      picker.appendChild(opt);
      if (p.slug === fromHash) start = i;
    });
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = '全部 ' + PRODUCTS.length + ' 页';
    picker.insertBefore(all, picker.firstChild);

    picker.value = String(start);
    render(start);

    picker.addEventListener('change', function () {
      render(picker.value === 'all' ? 'all' : parseInt(picker.value, 10));
    });
    document.getElementById('to-all').addEventListener('click', function () {
      picker.value = 'all';
      render('all');
    });
    document.getElementById('print').addEventListener('click', function () {
      window.print();
    });
    window.addEventListener('resize', fitScreen);
    fitScreen();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
