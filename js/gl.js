/* ============================================================================
   gl.js — the 3D stage.

   A small hand written WebGL renderer (no Three.js, no build step, no network)
   that draws one stack of hardcover books receding into the dark, exactly the
   way the reference site stages its catalogue:

     stack mode   books lie flat, cover up, band (spine strip) facing the camera,
                  arranged along +Y and pushed back along -Z so they shrink with
                  distance. Scroll translates the whole stack.
     detail mode  the active book stands up, turns three-quarters toward the
                  camera and can be spun by dragging.

   Faces of the box:  +Y cover   -Y back cover   +Z printed band
                      -Z fore-edge   ±X page block (left face is cloth),
   and the cover/band textures carry a foil mask in their ALPHA channel.
   ========================================================================== */
window.PRESS = window.PRESS || {};
(function () {
  'use strict';

  /* ------------------------------------------------------------- mat4 ------ */
  function m4() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mul(out, a, b) {
    for (var i = 0; i < 4; i++) {
      var ai0 = a[i], ai1 = a[4 + i], ai2 = a[8 + i], ai3 = a[12 + i];
      out[i]      = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
      out[4 + i]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
      out[8 + i]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
      out[12 + i] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return out;
  }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }
  function lookAt(out, eye, center, up) {
    var z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    var l = Math.hypot(z0, z1, z2) || 1; z0 /= l; z1 /= l; z2 /= l;
    var x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    l = Math.hypot(x0, x1, x2) || 1; x0 /= l; x1 /= l; x2 /= l;
    var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;
    return out;
  }

  /* ------------------------------------------------------------ geometry --- */
  /* Unit cube, x/y/z in [-0.5, 0.5]. Six faces, six vertices each, drawn as
     TRIANGLES with an offset so a face is one draw call.
     layout: px py pz nx ny nz u v                                              */
  var FACE_TOP = 0, FACE_BOTTOM = 1, FACE_BAND = 2, FACE_EDGE = 3, FACE_RIGHT = 4, FACE_LEFT = 5;
  var h = 0.5;
  var FACES = [
    { // top  (+Y) — front cover
      n: [0, 1, 0],
      v: [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]],
      uv: [[0, 1], [1, 1], [1, 0], [0, 0]]
    },
    { // bottom (-Y) — back cover
      n: [0, -1, 0],
      v: [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]],
      uv: [[1, 0], [0, 0], [0, 1], [1, 1]]
    },
    { // band (+Z) — printed strip facing the camera
      n: [0, 0, 1],
      v: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]],
      uv: [[0, 1], [1, 1], [1, 0], [0, 0]]
    },
    { // fore-edge (-Z)
      n: [0, 0, -1],
      v: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]],
      uv: [[0, 1], [1, 1], [1, 0], [0, 0]]
    },
    { // right (+X) — page block
      n: [1, 0, 0],
      v: [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]],
      uv: [[1, 1], [0, 1], [0, 0], [1, 0]]
    },
    { // left (-X) — cloth spine
      n: [-1, 0, 0],
      v: [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]],
      uv: [[1, 1], [0, 1], [0, 0], [1, 0]]
    }
  ];

  function buildGeometry() {
    var data = [];
    FACES.forEach(function (f) {
      var quad = [f.v[0], f.v[1], f.v[2], f.v[0], f.v[2], f.v[3]];
      var uvq = [f.uv[0], f.uv[1], f.uv[2], f.uv[0], f.uv[2], f.uv[3]];
      for (var i = 0; i < 6; i++) {
        data.push(quad[i][0], quad[i][1], quad[i][2], f.n[0], f.n[1], f.n[2], uvq[i][0], uvq[i][1]);
      }
    });
    return new Float32Array(data);
  }

  /* ------------------------------------------------------------- shaders --- */
  var VERT = [
    'attribute vec3 aPos;',
    'attribute vec3 aNormal;',
    'attribute vec2 aUV;',
    'uniform mat4 uProj, uView, uModel, uFace;',
    'uniform float uUvScale;',
    'varying vec2 vUV;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'void main() {',
    '  mat4 m = uModel * uFace;',
    '  vec4 world = m * vec4(aPos, 1.0);',
    '  vWorld = world.xyz;',
    '  vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);',
    '  vUV = aUV * vec2(1.0, uUvScale);',
    '  gl_Position = uProj * uView * world;',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform sampler2D uFoilTex;',
    'uniform vec3 uLightA, uLightB, uTint, uFogColor;',
    'uniform vec3 uCamera;',
    'uniform float uSpecI, uSpecP, uAmbient, uUseFoil, uOpacity, uFog;',
    'varying vec2 vUV;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'void main() {',
    '  vec4 texel = texture2D(uTex, vUV);',
    '  vec3 N = normalize(vNormal);',
    '  vec3 V = normalize(uCamera - vWorld);',
    '  if (dot(N, V) < 0.0) N = -N;',                     // page blocks are thin; keep them lit
    '  float foil = mix(0.1, texture2D(uFoilTex, vUV).r, uUseFoil);',
    '  float dA = max(dot(N, normalize(uLightA)), 0.0);',
    '  float dB = max(dot(N, normalize(uLightB)), 0.0);',
    '  float diff = uAmbient + 0.78 * dA + 0.22 * dB;',
    '  vec3 base = texel.rgb * uTint;',
    '  vec3 col = base * diff;',
    '  vec3 Hv = normalize(normalize(uLightA) + V);',
    '  float spec = pow(max(dot(N, Hv), 0.0), uSpecP) * uSpecI * (0.3 + 2.4 * foil);',
    '  vec3 specTint = mix(vec3(1.0), vec3(1.18, 1.02, 0.72), smoothstep(0.4, 0.95, foil));',
    '  col += specTint * spec;',
    '  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.05;',
    '  col += rim;',
    '  float dist = length(uCamera - vWorld);',
    '  float fog = 1.0 - exp(-max(dist - 1.4, 0.0) * uFog);',
    '  col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));',
    '  gl_FragColor = vec4(col * uOpacity, uOpacity);',    // premultiplied
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function texture(gl, canvas, uvScale) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    // v=0 is the top row of the canvas, so the cover reads the right way up
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return { tex: t, uvScale: uvScale == null ? 1 : uvScale };
  }

  /* ---------------------------------------------------------------- api ---- */
  var DEFAULTS = {
    fov: 12,              // long lens: keeps the slabs nearly the same size
    elevation: 6.2,       // degrees above the book plane
    distance: 6.16,       // camera distance to the focused book
    lookUp: 0,            // camera aims at the world origin
    stageTop: 0.12,       // fraction of the viewport taken by the page header
    rowFraction: 0.245,   // one DOM row as a fraction of the viewport height
    step: 0.10,           // depth step: later books are a little nearer
    hoverLift: 0.03,
    fog: 0.022,
    spin: 0.0042,         // radians per pixel dragged
    damping: 0.93,
    detailRotX: 1.30,     // standing pose: cover toward the camera, leaning back
    detailRotY: -0.44,    // turned a quarter to the left
    detailScale: 0.30,
    detailPos: [-0.30, 0.26, 1.20]
  };

  window.PRESS.GL = {
    create: function (canvas, products, options) {
      var params = {};
      var key;
      for (key in DEFAULTS) if (DEFAULTS.hasOwnProperty(key)) params[key] = DEFAULTS[key];
      for (key in (options || {})) if (options.hasOwnProperty(key)) params[key] = options[key];

      /* alpha:true + a transparent clear keeps the canvas a true overlay, so the
         CSS colour fill and the tiled film backdrop stay visible behind it. */
      var gl = canvas.getContext('webgl', {
        antialias: true, alpha: true, premultipliedAlpha: true, depth: true
      }) || canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
      if (!gl) return null;

      var program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('program: ' + gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, buildGeometry(), gl.STATIC_DRAW);
      var stride = 8 * 4;
      ['aPos', 'aNormal', 'aUV'].forEach(function (name, i) {
        var loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        var size = name === 'aUV' ? 2 : 3;
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, (i === 0 ? 0 : (i === 1 ? 12 : 24)));
      });

      var U = {};
      ['uProj','uView','uModel','uFace','uTex','uFoilTex','uLightA','uLightB','uTint','uFogColor',
        'uCamera','uSpecI','uSpecP','uAmbient','uUseFoil','uOpacity','uFog','uUvScale'].forEach(function (n) {
        U[n] = gl.getUniformLocation(program, n);
      });

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 1);

      /* textures -------------------------------------------------------- */
      var covers = window.PRESS.Covers;
      var sharedPaper = texture(gl, covers.paper(), 1);
      var sharedCloth = texture(gl, covers.cloth(), 1);
      /* Cover canvases are 448x644 and uploaded whole, so the full 0..1 UV range
         is the artwork. (NPOT + LINEAR + CLAMP_TO_EDGE is legal in WebGL 1.) */
      var UV = 1;

      var books = products.map(function (p, i) {
        var front = sharedPaper, band = sharedPaper, back = sharedPaper;
        var frontFoil = null, bandFoil = null;
        try {
          front = texture(gl, covers.front(p), UV);
          frontFoil = texture(gl, covers.foil(p), 1);
          band = texture(gl, covers.band(p), 1);
          bandFoil = texture(gl, covers.bandFoil(p), 1);
          back = texture(gl, covers.back(p), UV);
        } catch (e) {
          // a broken cover must never take the stage down: fall back to paper
        }
        var W = 1;
        var H = W * 736 / 512;
        var T = 0.072 + ((Math.abs(hashInt(p.slug)) % 5) * 0.011);
        return {
          product: p,
          index: i,
          W: W, H: H, T: T,
          tex: {
            front: front, frontFoil: frontFoil, band: band, bandFoil: bandFoil,
            back: back, paper: sharedPaper, cloth: sharedCloth
          },
          lift: 0, liftTarget: 0,
          opacity: 1, opacityTarget: 1,
          spinX: 0, spinY: 0, velX: 0, velY: 0,
          scale: 1,
          pose: [0, 0, 0], rot: [0, 0, 0]
        };
      });

      function hashInt(s) {
        var n = 0;
        for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) | 0;
        return n;
      }

      /* state ----------------------------------------------------------- */
      var state = {
        progress: 0, progressTarget: 0,
        active: null, mix: 0, mixTarget: 0,
        hover: null,
        dragging: false,
        width: 1, height: 1, dpr: 1
      };

      var bg = { r: 32 / 255, g: 24 / 255, b: 25 / 255 };

      /* Framing. The canvas is 70vw wide, so on a narrow window it becomes taller
         than it is wide and a 1-unit-wide book would overflow the canvas and get
         clipped. fitScale() pulls the camera back for those shapes; the stack's
         world pitch stays put, so slabs and gaps shrink together and the
         composition is unchanged. */
      function fitScale() {
        var aspect = state.width / Math.max(1, state.height);
        return Math.min(1, aspect / 1.10);
      }
      /* nominal frustum: the pitch and the lift are expressed against it */
      function frustumHeight() {
        return 2 * params.distance * Math.tan(params.fov * Math.PI / 360);
      }
      function frustumEff() { return frustumHeight() / fitScale(); }
      /* one DOM row, as a fraction of the viewport height, right now */
      function rowFractionNow() { return params.rowFraction * fitScale(); }
      function stackGap() { return params.rowFraction * frustumHeight(); }
      /* half a row below the stage's top edge, so slab i lands exactly on row i */
      function stackLift() {
        return (0.5 - (params.stageTop || 0) - rowFractionNow() / 2) * frustumEff();
      }

      function setBackground(hex) {
        if (!hex) return;
        var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace('#', ''));
        if (!m) return;
        bg.r = parseInt(m[1], 16) / 255;
        bg.g = parseInt(m[2], 16) / 255;
        bg.b = parseInt(m[3], 16) / 255;
      }

      function resize() {
        var rect = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(320, Math.round(rect.width * dpr));
        var h = Math.max(320, Math.round(rect.height * dpr));
        var cap = 2000;
        if (w > cap) { h = Math.round(h * cap / w); w = cap; }
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
        }
        state.width = rect.width || 1;
        state.height = rect.height || 1;
        state.dpr = dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      /* per-face matrices ------------------------------------------------- */
      function faceMatrix(b, face) {
        var m = m4();
        var W = b.W, T = b.T, H = b.H;
        if (face === FACE_TOP) {
          m[0] = W; m[5] = 1; m[10] = H;
          m[13] = (T - 1) / 2;
        } else if (face === FACE_BOTTOM) {
          m[0] = W; m[5] = 1; m[10] = H;
          m[13] = (1 - T) / 2;
        } else if (face === FACE_BAND) {
          m[0] = W; m[5] = T; m[10] = 1;
          m[14] = (H - 1) / 2;
        } else if (face === FACE_EDGE) {
          m[0] = W; m[5] = T; m[10] = 1;
          m[14] = (1 - H) / 2;
        } else if (face === FACE_RIGHT) {
          m[0] = 1; m[5] = T; m[10] = H;
          m[12] = (W - 1) / 2;
        } else {
          m[0] = 1; m[5] = T; m[10] = H;
          m[12] = (1 - W) / 2;
        }
        return m;
      }

      var FACE_INFO = [
        { tex: 'front', foilTex: 'frontFoil', specI: 0.30, specP: 26, tint: [1, 1, 1], ambient: 0.30 },
        { tex: 'back', foilTex: null, specI: 0.10, specP: 14, tint: [0.92, 0.92, 0.94], ambient: 0.26 },
        { tex: 'band', foilTex: 'bandFoil', specI: 0.42, specP: 30, tint: [1, 1, 1], ambient: 0.32 },
        { tex: 'paper', foilTex: null, specI: 0.07, specP: 9, tint: [0.97, 0.95, 0.9], ambient: 0.34 },
        { tex: 'paper', foilTex: null, specI: 0.07, specP: 9, tint: [0.95, 0.93, 0.88], ambient: 0.34 },
        { tex: 'cloth', foilTex: null, specI: 0.12, specP: 11, tint: [0.86, 0.86, 0.88], ambient: 0.28 }
      ];

      function modelMatrix(b) {
        var m = m4();
        // rotate (detail pose mixes in), then scale, then translate
        var rx = b.rot[0], ry = b.rot[1];
        var s = b.scale;
        var cx = Math.cos(rx), sx = Math.sin(rx);
        var cy = Math.cos(ry), sy = Math.sin(ry);
        // R = Ry * Rx
        var r = [
          cy * s,        0,        -sy * s,
          sx * sy * s,   cx * s,   sx * cy * s,
          cx * sy * s,   -sx * s,  cx * cy * s
        ];
        m[0] = r[0]; m[1] = r[1]; m[2] = r[2]; m[3] = 0;
        m[4] = r[3]; m[5] = r[4]; m[6] = r[5]; m[7] = 0;
        m[8] = r[6]; m[9] = r[7]; m[10] = r[8]; m[11] = 0;
        m[12] = b.pose[0]; m[13] = b.pose[1]; m[14] = b.pose[2];
        return m;
      }

      var proj = m4(), view = m4(), model = m4(), cam = [0, 0, 0];

      function updatePose(b) {
        // passed books sit higher and further away; upcoming books sit lower and
        // a little nearer, so content travels up (and shrinks) as you scroll down
        var passed = state.progress - b.index;
        var stack = 1 - ((state.active === b.index) ? state.mix : 0);
        var mix = 1 - stack;
        var det = params.detailPos;
        b.pose[0] = det[0] * mix;
        b.pose[1] = (stackLift() + passed * stackGap()) * stack + det[1] * mix + b.lift * stack;
        b.pose[2] = -passed * params.step * stack + det[2] * mix;
        b.rot[0] = params.detailRotX * mix + b.spinX * mix;
        b.rot[1] = params.detailRotY * mix + b.spinY * mix;
        b.scale = 1 - (1 - params.detailScale) * mix;
        b.opacityTarget = (state.active === null) ? 1 : (state.active === b.index ? 1 : 0);
      }

      function render() {
        var elev = params.elevation * Math.PI / 180;
        var camD = params.distance / fitScale();
        var camY = Math.sin(elev) * camD + params.lookUp;
        var camZ = Math.cos(elev) * camD;
        cam = [0, camY, camZ];

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        perspective(proj, params.fov * Math.PI / 180, state.width / state.height, 0.05, 60);
        lookAt(view, cam, [0, params.lookUp, 0], [0, 1, 0]);
        gl.uniformMatrix4fv(U.uProj, false, proj);
        gl.uniformMatrix4fv(U.uView, false, view);
        gl.uniform3fv(U.uCamera, cam);
        gl.uniform3fv(U.uLightA, [0.42, 0.86, 0.30]);
        gl.uniform3fv(U.uLightB, [-0.55, 0.35, 0.75]);
        gl.uniform3fv(U.uFogColor, [bg.r, bg.g, bg.b]);
        gl.uniform1f(U.uFog, params.fog);

        // near books last so overlapping stays correct with the depth buffer
        var order = books.slice().sort(function (a, b) { return b.pose[2] - a.pose[2]; });
        for (var k = 0; k < order.length; k++) {
          var b = order[k];
          if (b.opacity < 0.01) continue;
          if (Math.abs((state.progress - b.index) * stackGap()) > 1.9) continue;   // off stage
          var mv = modelMatrix(b);
          gl.uniformMatrix4fv(U.uModel, false, mv);
          gl.uniform1f(U.uOpacity, b.opacity);
          for (var f = 0; f < 6; f++) {
            var info = FACE_INFO[f];
            var t = b.tex[info.tex];
            var foilT = info.foilTex ? b.tex[info.foilTex] : null;
            gl.uniform1f(U.uSpecI, info.specI);
            gl.uniform1f(U.uSpecP, info.specP);
            gl.uniform1f(U.uUseFoil, info.foilTex ? 1 : 0);
            gl.uniform1f(U.uAmbient, info.ambient);
            gl.uniform3fv(U.uTint, info.tint);
            gl.uniform1f(U.uUvScale, t ? t.uvScale : 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, t ? t.tex : sharedPaper.tex);
            gl.uniform1i(U.uTex, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, (foilT || sharedPaper).tex);
            gl.uniform1i(U.uFoilTex, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.uniformMatrix4fv(U.uFace, false, faceMatrix(b, f));
            gl.drawArrays(gl.TRIANGLES, f * 6, 6);
          }
        }
      }

      /* animation -------------------------------------------------------- */
      var running = false, rafId = 0;

      function integrate() {
        state.progress += (state.progressTarget - state.progress) * 0.16;
        state.mix += (state.mixTarget - state.mix) * 0.10;
        for (var i = 0; i < books.length; i++) {
          var b = books[i];
          b.lift += (b.liftTarget - b.lift) * 0.18;
          b.opacity += (b.opacityTarget - b.opacity) * 0.16;
          if (state.active === i) {
            b.velX *= params.damping;
            b.velY *= params.damping;
            b.spinX += b.velX;
            b.spinY += b.velY;
            b.spinX = Math.max(-1.25, Math.min(1.25, b.spinX));
            b.spinY = Math.max(-1.5, Math.min(1.5, b.spinY));
            if (!state.dragging) {                       // ease back to the posed angle
              b.velX += -b.spinX * 0.012;
              b.velY += -b.spinY * 0.012;
            }
          } else {
            b.spinX += (0 - b.spinX) * 0.12;
            b.spinY += (0 - b.spinY) * 0.12;
            b.velX = b.velY = 0;
          }
          updatePose(b);
        }
      }

      function frame() {
        if (!running) return;
        integrate();
        render();
        rafId = requestAnimationFrame(frame);
      }

      var api = {
        params: params,
        books: books,
        resize: function () { resize(); },
        rowFractionNow: rowFractionNow,
        setStageTop: function (f) { params.stageTop = f; },
        setProgress: function (p) { state.progressTarget = p; },
        jumpTo: function (p) { state.progress = state.progressTarget = p; },
        setHover: function (i) {
          state.hover = i;
          for (var k = 0; k < books.length; k++) books[k].liftTarget = (k === i) ? params.hoverLift : 0;
        },
        setActive: function (i) {
          state.active = i;
          state.mixTarget = (i === null) ? 0 : 1;
          if (i === null) {
            state.mix = 0;
            for (var k = 0; k < books.length; k++) { books[k].spinX = books[k].spinY = books[k].velX = books[k].velY = 0; }
          }
        },
        setBackground: setBackground,
        /** Run the state integration n times without rendering — used to snap
            an animated pose in tests and for the "settle immediately" path when
            prefers-reduced-motion is set. */
        advance: function (n) { for (var i = 0; i < (n || 60); i++) integrate(); },
        setDragging: function (v) { state.dragging = !!v; },
        spin: function (dx, dy) {
          var b = state.active === null ? null : books[state.active];
          if (!b) return;
          b.velY -= dx * params.spin;      // drag right -> the book turns left
          b.velX += dy * params.spin;      // drag down  -> the cover tips back
        },
        start: function () {
          if (running) return;
          running = true;
          resize();
          rafId = requestAnimationFrame(frame);
        },
        stop: function () { running = false; cancelAnimationFrame(rafId); },
        renderOnce: function () { resize(); render(); }
      };

      return api;
    }
  };
})();
