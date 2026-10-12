/* ============================================================================
   covers.js — procedural artwork.

   Nothing here is downloaded. Every cover, band, page block and poster is
   drawn into a canvas at runtime, so the site has zero image assets and no
   licensing to worry about. Swap in real art later if you want:
   replace PRESS.Covers.front() with an <img> loader and keep the same shape.

   front(product) -> { art, foil }   art is RGBA; its ALPHA channel is the
                                     foil/varnish mask used by the shader.
   band(product)  -> RGBA canvas; alpha = foil mask (type + mark).
   back(product)  -> RGB canvas (mark + barcode).
   paper()        -> shared page-block texture.
   cloth()        -> shared cloth spine texture.
   poster(product)-> wide backdrop for film / podcast panels.
   zine(product)  -> small preview spread for the detail panel.
   ========================================================================== */
window.PRESS = window.PRESS || {};
(function () {
  'use strict';

  var SERIF = '"Ivar Display", "Playfair Display", "Songti SC", "Noto Serif SC", Georgia, "Times New Roman", serif';
  var SERIF_TEXT = '"Ivar Text", "Songti SC", "Noto Serif SC", Georgia, serif';

  function canvas(w, h) {
    var c = window.document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '#000000').trim());
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function shade(hex, amount) {
    var c = hexToRgb(hex);
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v + 255 * amount))); };
    return 'rgb(' + f(c.r) + ',' + f(c.g) + ',' + f(c.b) + ')';
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* ---------------------------------------------------------------- type ---- */

  function fitFont(ctx, text, maxWidth, size, weight, family) {
    var s = size;
    do {
      ctx.font = weight + ' ' + s + 'px ' + family;
      if (ctx.measureText(text).width <= maxWidth) break;
      s -= 2;
    } while (s > 8);
    return s;
  }

  function wrap(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* -------------------------------------------------------------- mark ------ */
  /* A small maker's stamp: three quarter arcs and a dot. Deliberately simple so
     it stays legible at 8px on the band and 60px on the cover.                */
  function mark(ctx, cx, cy, size, color) {
    var r = size * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.lineCap = 'butt';
    var widths = [1, 0.74, 0.48];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, size * (i === 0 ? 0.1 : 0.075));
      ctx.arc(0, 0, r * widths[i], Math.PI * 0.62, Math.PI * 2.12);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(r * 0.2, r * 0.2, Math.max(1, size * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  window.PRESS.mark = mark;

  /* --------------------------------------------------------- art rules ----- */

  var RULES = {
    marble: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.paper; ctx.fillRect(0, 0, w, h);
      var bands = 34;
      for (var i = 0; i < bands; i++) {
        var t = i / bands;
        var amp = 14 + rand() * 46;
        var k = 2 + rand() * 5;
        var phase = rand() * Math.PI * 2;
        var y0 = t * h * 1.18 - h * 0.09;
        ctx.beginPath();
        for (var x = -20; x <= w + 20; x += 12) {
          var y = y0 + Math.sin((x / w) * k * Math.PI + phase) * amp * (0.5 + rand() * 0.02);
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 3 + rand() * 24;
        ctx.strokeStyle = rand() < 0.42 ? rgba(c.accent, 0.55 + rand() * 0.35)
          : rand() < 0.7 ? rgba(c.motif, 0.5 + rand() * 0.4)
            : rgba(c.ink, 0.28 + rand() * 0.3);
        ctx.stroke();
      }
      // a few hard ink veins
      for (var v = 0; v < 7; v++) {
        ctx.beginPath();
        var yv = rand() * h;
        ctx.moveTo(0, yv);
        for (var xv = 0; xv <= w; xv += 24) ctx.lineTo(xv, yv + Math.sin(xv / 60 + v) * 26);
        ctx.lineWidth = 1.1; ctx.strokeStyle = rgba(c.ink, 0.5); ctx.stroke();
      }
    },

    halftone: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var step = w / 30;
      for (var y = step / 2; y < h; y += step) {
        for (var x = step / 2; x < w; x += step) {
          var nx = x / w, ny = y / h;
          var v = Math.sin(nx * 6.1 + 0.6) * 0.5 + Math.sin(ny * 9.3) * 0.32 + Math.sin((nx + ny) * 4.2) * 0.3;
          var r = Math.max(0, v) * step * 0.62 + (rand() - 0.5) * 1.2;
          if (r <= 0.25) continue;
          ctx.beginPath();
          ctx.fillStyle = ny < 0.42 ? c.accent : (ny < 0.72 ? c.paper : c.motif);
          ctx.globalAlpha = 0.94;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(c.paper, 0.9);
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
    },

    topo: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.paper; ctx.fillRect(0, 0, w, h);
      var cx = w * (0.3 + rand() * 0.4), cy = h * (0.55 + rand() * 0.2);
      for (var ring = 0; ring < 26; ring++) {
        var base = 18 + ring * (Math.max(w, h) / 22);
        ctx.beginPath();
        for (var a = 0; a <= 64; a++) {
          var ang = (a / 64) * Math.PI * 2;
          var wob = 1 + Math.sin(ang * 3 + ring * 0.4) * 0.07 + Math.sin(ang * 5 - ring * 0.24) * 0.04;
          var rr = base * wob;
          var px = cx + Math.cos(ang) * rr * 1.15;
          var py = cy + Math.sin(ang) * rr * 0.88;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.lineWidth = ring % 5 === 0 ? 1.7 : 0.9;
        ctx.strokeStyle = rgba(ring % 5 === 0 ? c.motif : c.ink, 0.85);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.accent;
      ctx.fillRect(w * 0.62, h * 0.08, w * 0.3, h * 0.055);
      ctx.globalAlpha = 1;
    },

    contour: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var cx = w * 0.42, cy = h * 0.46;
      for (var ring = 30; ring >= 1; ring--) {
        var base = ring * (Math.max(w, h) / 20);
        ctx.beginPath();
        for (var a = 0; a <= 72; a++) {
          var ang = (a / 72) * Math.PI * 2;
          var wob = 1 + Math.sin(ang * 2.6 + ring * 0.5) * 0.11 + Math.sin(ang * 6.1) * 0.05;
          var rr = base * wob;
          var px = cx + Math.cos(ang) * rr * 1.3;
          var py = cy + Math.sin(ang) * rr;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        var t = ring / 30;
        ctx.fillStyle = ring % 2 ? rgba(c.paper, 0.1 + t * 0.35) : rgba(c.motif, 0.12 + t * 0.3);
        ctx.fill();
        ctx.lineWidth = 0.8; ctx.strokeStyle = rgba(c.paper, 0.5); ctx.stroke();
      }
    },

    stripes: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var x = 0;
      while (x < w) {
        var bw = 4 + rand() * 30;
        ctx.fillStyle = rand() < 0.3 ? c.accent : (rand() < 0.5 ? rgba(c.paper, 0.9) : rgba(c.motif, 0.6));
        ctx.fillRect(x, 0, bw, h * (0.5 + rand() * 0.5));
        x += bw + 3 + rand() * 12;
      }
      ctx.globalAlpha = 0.25;
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, c.ink); g.addColorStop(1, c.motif);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    },

    circles: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 16; i++) {
        var r = w * (0.12 + rand() * 0.5);
        var cx = rand() * w, cy = rand() * h;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (rand() < 0.4) { ctx.fillStyle = rgba(c.motif, 0.5); ctx.fill(); }
        ctx.lineWidth = 1 + rand() * 3;
        ctx.strokeStyle = rand() < 0.5 ? rgba(c.accent, 0.85) : rgba(c.paper, 0.7);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = c.accent;
      ctx.fillRect(0, h * 0.86, w, h * 0.05);
      ctx.globalAlpha = 1;
    },

    blueprint: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = rgba(c.motif, 0.55);
      ctx.lineWidth = 0.7;
      var step = w / 16;
      for (var x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = rgba(c.paper, 0.92);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.17, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.9); ctx.lineTo(w * 0.92, h * 0.12);
      ctx.setLineDash([10, 7]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.accent;
      ctx.fillRect(w * 0.08, h * 0.06, w * 0.22, 6);
    },

    botanical: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.paper; ctx.fillRect(0, 0, w, h);
      var cols = 4, rows = 6;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var cx = w * (0.14 + i * 0.24), cy = h * (0.1 + j * 0.16);
          var s = w * 0.055 * (0.8 + rand() * 0.5);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((rand() - 0.5) * 1.1);
          ctx.strokeStyle = j % 3 === 0 ? c.accent : rgba(c.ink, 0.85);
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(0, s * 1.7); ctx.lineTo(0, -s * 1.5); ctx.stroke();
          for (var l = 0; l < 5; l++) {
            var ly = s * 1.2 - l * s * 0.62;
            var dir = l % 2 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.quadraticCurveTo(dir * s * 0.9, ly - s * 0.2, dir * s * 1.15, ly - s * 0.75);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = c.motif;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    },

    ripple: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var cx = w * 0.5, cy = h * 0.36;
      for (var i = 26; i >= 1; i--) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + i * 6, i * w * 0.028, i * h * 0.014, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(i % 3 === 0 ? c.accent : c.motif, 0.16 + (26 - i) * 0.02);
        ctx.fill();
      }
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = c.paper;
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    },

    arcs: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.lineWidth = 6 + rand() * 26;
        ctx.strokeStyle = i % 3 === 0 ? rgba(c.accent, 0.92) : rgba(i % 2 ? c.paper : c.motif, 0.6);
        var r = w * (0.3 + i * 0.17);
        ctx.arc(w * (0.1 + rand() * 0.2), h * (0.8 + rand() * 0.2), r, Math.PI * 1.05, Math.PI * 1.92);
        ctx.stroke();
      }
    },

    concentric: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.paper; ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      for (var i = 18; i >= 1; i--) {
        var s = i * (Math.max(w, h) / 17) * 0.5;
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2);
        ctx.fillStyle = i % 2 ? rgba(c.ink, 0.14) : rgba(c.motif, 0.4);
        ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = rgba(c.ink, 0.6); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = c.accent;
      ctx.fillRect(w * 0.08, h * 0.86, w * 0.34, h * 0.02);
    },

    waveform: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var bars = 46;
      for (var i = 0; i < bars; i++) {
        var t = i / bars;
        var bh = (0.5 + 0.5 * Math.sin(t * 17.3) * Math.cos(t * 4.1)) * h * 0.68;
        bh = Math.max(h * 0.012, Math.abs(bh));
        ctx.fillStyle = i % 9 === 0 ? c.accent : rgba(c.paper, 0.85);
        ctx.fillRect(t * w * 0.96 + w * 0.02, h / 2 - bh / 2, w * 0.012, bh);
      }
      ctx.fillStyle = rgba(c.motif, 0.35);
      ctx.fillRect(0, h * 0.5 - 1, w, 2);
    },

    starfield: function (ctx, w, h, c, rand) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#05060a'); g.addColorStop(0.62, c.ink); g.addColorStop(1, '#0d0f14');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 420; i++) {
        var s = rand(); var r = s * s * 2.6 + 0.3;
        ctx.globalAlpha = 0.25 + rand() * 0.75;
        ctx.fillStyle = rand() < 0.12 ? c.motif : '#ffffff';
        ctx.beginPath(); ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      var glow = ctx.createRadialGradient(w * 0.68, h * 0.34, 0, w * 0.68, h * 0.34, w * 0.5);
      glow.addColorStop(0, rgba(c.paper, 0.22)); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = rgba(c.paper, 0.5); ctx.lineWidth = 2;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.82 + Math.sin(x / 90) * 22);
      ctx.stroke();
    },

    venn: function (ctx, w, h, c, rand) {
      ctx.fillStyle = c.ink; ctx.fillRect(0, 0, w, h);
      var blob = function (cx, cy, r) {
        ctx.beginPath();
        for (var a = 0; a <= 40; a++) {
          var ang = (a / 40) * Math.PI * 2;
          var rr = r * (1 + Math.sin(ang * 3 + 1) * 0.08);
          var px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      var cy = h * 0.46, r = w * 0.3;
      ctx.save();
      blob(w * 0.5, cy - r * 0.62, r); ctx.clip();
      var g1 = ctx.createLinearGradient(0, 0, w, h);
      g1.addColorStop(0, c.motif); g1.addColorStop(1, c.accent);
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.5;
      for (var i = 0; i < 60; i++) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
      }
      ctx.restore();
      ctx.save();
      blob(w * 0.5, cy + r * 0.62, r); ctx.clip();
      g1 = ctx.createLinearGradient(0, h, w, 0);
      g1.addColorStop(0, c.motif); g1.addColorStop(1, c.ink);
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - r * 0.62, cy);
      ctx.quadraticCurveTo(w * 0.5, cy - r * 0.5, w * 0.5 + r * 0.62, cy);
      ctx.quadraticCurveTo(w * 0.5, cy + r * 0.5, w * 0.5 - r * 0.62, cy);
      ctx.fillStyle = c.accent; ctx.fill();
      ctx.strokeStyle = rgba(c.paper, 0.75); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w * 0.5, cy - r * 0.62, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.5, cy + r * 0.62, r, 0, Math.PI * 2); ctx.stroke();
    }
  };

  /* ---------------------------------------------------------- paper grain --- */
  var grainCache = null;
  function grain() {
    if (grainCache) return grainCache;
    var size = 128;
    var c = canvas(size, size);
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(size, size);
    var rand = rng(4242);
    for (var i = 0; i < size * size; i++) {
      var v = 150 + Math.round(rand() * 105);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainCache = c;
    return c;
  }

  function applyGrain(ctx, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    var g = grain();
    var pattern = ctx.createPattern(g, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ------------------------------------------------------------- builders --- */
  var COVER_W = 448, COVER_H = 644;
  var BAND_W = 1024, BAND_H = 154;

  /* Which rules paint on an ink base? Their bands need a heavier paper wash. */
  var DARK_RULES = /halftone|contour|stripes|circles|blueprint|ripple|arcs|waveform|starfield|venn/;

  /* the generative rule on its own — no mark, no type — so the band can wrap the
     artwork without printing the cover's title twice */
  function patternCanvas(p) {
    var c = canvas(COVER_W, COVER_H);
    var ctx = c.getContext('2d');
    var spec = p.cover;
    var rand = rng(hash(p.slug));
    (RULES[spec.rule] || RULES.marble)(ctx, COVER_W, COVER_H, spec, rand);
    return c;
  }

  /* the finished front cover: pattern + mark + legibility wash + type */
  function artCanvas(p) {
    var c = patternCanvas(p);
    var ctx = c.getContext('2d');
    var spec = p.cover;

    // publisher mark, top right
    var ink = spec.rule === 'starfield' ? spec.paper : spec.ink;
    mark(ctx, COVER_W * 0.84, COVER_H * 0.115, COVER_W * 0.11,
      (spec.rule === 'halftone' || spec.rule === 'concentric' || spec.rule === 'topo' ||
        spec.rule === 'botanical' || spec.rule === 'marble' || spec.rule === 'stripes' ||
        spec.rule === 'ripple' || spec.rule === 'arcs') ? spec.ink : spec.paper);

    /* The cover is artwork plus the maker's mark: the title lives on the printed
       band, exactly like the reference, so the stack never reads as doubled type. */
    applyGrain(ctx, COVER_W, COVER_H, 0.16);
    return c;
  }

  /* Foil mask, drawn at half resolution: it is a soft stamp map, and keeping it
     out of the colour texture's alpha channel avoids WebGL un-premultiplying the
     cover to black on upload. */
  function foilMaskFor(p) {
    var s = 0.5;
    var c = canvas(COVER_W * s, COVER_H * s);
    var ctx = c.getContext('2d');
    ctx.scale(s, s);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, COVER_W, COVER_H);
    var spec = p.cover;
    var rand = rng(hash(p.slug + '-foil'));
    ctx.fillStyle = '#fff';
    // stamped mark
    mark(ctx, COVER_W * 0.84, COVER_H * 0.115, COVER_W * 0.11, '#fff');
    // a varnish sweep across the lower third, plus a stamped panel for some rules
    var sweep = ctx.createLinearGradient(0, COVER_H * 0.7, 0, COVER_H);
    sweep.addColorStop(0, 'rgba(0,0,0,0)');
    sweep.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, COVER_H * 0.7, COVER_W, COVER_H * 0.3);
    if (spec.rule === 'topo' || spec.rule === 'contour' || spec.rule === 'blueprint' || spec.rule === 'waveform') {
      ctx.fillRect(COVER_W * 0.62, COVER_H * 0.06, COVER_W * 0.3, COVER_H * 0.02);
    }
    if (spec.rule === 'marble') {
      // scattered foil flecks, like a stamped marble
      for (var f = 0; f < 90; f++) {
        ctx.globalAlpha = 0.35 + rand() * 0.5;
        ctx.beginPath();
        ctx.arc(rand() * COVER_W, rand() * COVER_H, rand() * 5 + 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    return c;
  }

  /* Band metrics are always measured on a full-resolution probe, never on the
     scaled context, so the printed band and its foil stamp stay registered. */
  var probeCtx = null;
  function bandMetrics(p) {
    if (!probeCtx) probeCtx = canvas(BAND_W, BAND_H).getContext('2d');
    var author = (p.author || p.rowLabel || '').toUpperCase();
    return {
      author: author,
      authorSize: fitFont(probeCtx, author, BAND_W * 0.26, Math.round(BAND_H * 0.28), '600', SERIF),
      titleSize: fitFont(probeCtx, p.title, BAND_W * 0.38, Math.round(BAND_H * 0.34), '700', SERIF)
    };
  }

  /* Printed band layout: author left, title centred, mark right. Each zone gets a
     hard width budget, so long author names can never run under the title. */
  function bandType(ctx, p, ink) {
    var pad = BAND_W * 0.055;
    var m = bandMetrics(p);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.font = '600 ' + m.authorSize + 'px ' + SERIF;
    ctx.fillText(m.author, pad, BAND_H * 0.53);

    ctx.textAlign = 'center';
    ctx.font = '700 ' + m.titleSize + 'px ' + SERIF;
    ctx.fillText(p.title, BAND_W * 0.53, BAND_H * 0.53);

    mark(ctx, BAND_W - pad - BAND_H * 0.4, BAND_H * 0.52, BAND_H * 0.6, ink);
    ctx.textAlign = 'left';
  }

  function bandCanvas(p) {
    var c = canvas(BAND_W, BAND_H);
    var ctx = c.getContext('2d');
    var spec = p.cover;
    // a wrap of the artwork (pattern only), softened into a paper band
    ctx.drawImage(patternCanvas(p), 0, COVER_H * 0.42, COVER_W, COVER_W * (BAND_H / BAND_W),
      0, 0, BAND_W, BAND_H);
    ctx.fillStyle = rgba(spec.paper, DARK_RULES.test(spec.rule) ? 0.74 : 0.5);
    ctx.fillRect(0, 0, BAND_W, BAND_H);

    var ink = spec.rule === 'starfield' ? spec.paper : spec.ink;
    bandType(ctx, p, ink);

    return c;
  }

  /* the band's foil stamp: type and mark only */
  function bandFoilFor(p) {
    var s = 0.5;
    var m = canvas(BAND_W * s, BAND_H * s);
    var mctx = m.getContext('2d');
    mctx.scale(s, s);
    mctx.fillStyle = '#000'; mctx.fillRect(0, 0, BAND_W, BAND_H);
    mctx.fillStyle = '#fff';
    mctx.textBaseline = 'middle';
    bandType(mctx, p, '#fff');
    return m;
  }

  function barcode(ctx, x, y, w, h, seed) {
    var rand = rng(seed);
    ctx.fillStyle = '#f6f2ea';
    ctx.fillRect(x, y, w, h);
    var cx = x + w * 0.06;
    while (cx < x + w * 0.94) {
      var bw = rand() < 0.5 ? 1 + rand() * 2 : 1 + rand() * 5;
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(cx, y + h * 0.12, bw, h * 0.6);
      cx += bw + 1 + rand() * 3;
    }
    ctx.fillStyle = '#1b1b1b';
    ctx.font = '9px ' + SERIF_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText('9 781234 567890', x + w / 2, y + h * 0.94);
    ctx.textAlign = 'left';
  }

  function backCanvas(p) {
    var c = canvas(COVER_W, COVER_H);
    var ctx = c.getContext('2d');
    var spec = p.cover;
    ctx.fillStyle = spec.rule === 'starfield' ? '#0b0d12' : spec.ink;
    ctx.fillRect(0, 0, COVER_W, COVER_H);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = spec.paper;
    ctx.fillRect(0, 0, COVER_W, COVER_H);
    ctx.globalAlpha = 1;
    mark(ctx, COVER_W * 0.14, COVER_H * 0.1, COVER_W * 0.1, rgba(spec.paper, 0.55));
    ctx.fillStyle = rgba(spec.paper, 0.7);
    ctx.font = '600 ' + Math.round(COVER_W * 0.032) + 'px ' + SERIF;
    ctx.fillText('PAPER & SIGNAL', COVER_W * 0.08, COVER_H * 0.22);
    ctx.font = 'italic 400 ' + Math.round(COVER_W * 0.03) + 'px ' + SERIF_TEXT;
    var blurb = wrap(ctx, p.about || p.subtitle || '', COVER_W * 0.74).slice(0, 6);
    for (var i = 0; i < blurb.length; i++) {
      ctx.fillText(blurb[i], COVER_W * 0.08, COVER_H * 0.3 + i * COVER_W * 0.045);
    }
    barcode(ctx, COVER_W * 0.56, COVER_H * 0.82, COVER_W * 0.34, COVER_H * 0.1, hash(p.slug + 'bc'));
    applyGrain(ctx, COVER_W, COVER_H, 0.1);
    return c;
  }

  var paperCache = null, clothCache = null;
  function paperCanvas() {
    if (paperCache) return paperCache;
    var w = 256, h = 256;
    var c = canvas(w, h);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#efe9dc'; ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? 'rgba(160,148,126,0.30)' : 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, y, w, 1);
    }
    applyGrain(ctx, w, h, 0.22);
    paperCache = c;
    return c;
  }

  function clothCanvas() {
    if (clothCache) return clothCache;
    var w = 256, h = 256;
    var c = canvas(w, h);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, y, w, 1);
    }
    for (var x = 0; x < w; x += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, 0, 1, h);
    }
    applyGrain(ctx, w, h, 0.3);
    clothCache = c;
    return c;
  }

  function posterCanvas(p, w, h) {
    var c = canvas(w || 1280, h || 520);
    var ctx = c.getContext('2d');
    (RULES[p.cover.rule] || RULES.starfield)(ctx, c.width, c.height, p.cover, rng(hash(p.slug + 'poster')));
    return c;
  }

  function zineCanvas(p) {
    var w = 420, h = 300;
    var c = canvas(w, h);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#efeade'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2dbcb'; ctx.fillRect(w / 2 - 1, 0, 2, h);
    var art = artCanvas(p);
    ctx.drawImage(art, 18, 22, 150, 216);
    ctx.drawImage(art, 0, 0, art.width * 0.5, art.height * 0.5, w / 2 + 26, 30, 160, 140);
    ctx.fillStyle = p.cover.ink;
    ctx.font = '700 20px ' + SERIF;
    ctx.fillText(p.title.slice(0, 22), w / 2 + 26, 196);
    ctx.font = 'italic 400 14px ' + SERIF_TEXT;
    var lines = wrap(ctx, (p.about || '').slice(0, 150), 150).slice(0, 5);
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], w / 2 + 26, 220 + i * 18);
    applyGrain(ctx, w, h, 0.12);
    return c;
  }

  window.PRESS.Covers = {
    front: function (p) {
      return artCanvas(p);
    },
    foil: foilMaskFor,
    band: bandCanvas,
    bandFoil: bandFoilFor,
    back: backCanvas,
    paper: paperCanvas,
    cloth: clothCanvas,
    poster: posterCanvas,
    zine: zineCanvas,
    mark: mark,
    shade: shade,
    rgba: rgba,
    serif: function (weight, size) { return weight + ' ' + size + 'px ' + SERIF; }
  };
})();
