/* ============================================================================
   audio.js — optional audio for podcast episodes.

   Two paths, both front-end only:
     1. episode.audio = "assets/audio/ep1.mp3"  -> a real <audio> element fed
        through a WebAudio analyser, so the waveform is the real thing.
     2. no audio file -> a generated ambient bed (three detuned oscillators
        through a slow filter sweep) so the player and waveform still work.
        It is labelled as a preview in the UI.
   ========================================================================== */
window.PRESS = window.PRESS || {};
(function () {
  'use strict';

  function supported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /* --- generated ambient bed ---------------------------------------------- */
  function createSynth() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0;
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.6;

    var voices = [];
    [110, 164.81, 220, 329.63].forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 7;
      var g = ctx.createGain();
      g.gain.value = 0.16 / (i + 1);
      osc.connect(g);
      g.connect(filter);
      osc.start();
      voices.push(osc);
    });

    // slow filter + gain drift so it never sits still
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    filter.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    var playing = false;
    var startedAt = 0;

    return {
      kind: 'synth',
      analyser: analyser,
      isPlaying: function () { return playing; },
      play: function () {
        if (ctx.state === 'suspended') ctx.resume();
        if (!startedAt) startedAt = ctx.currentTime;
        playing = true;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
        // gently retune so repeated plays differ
        voices.forEach(function (osc, i) {
          osc.frequency.setTargetAtTime(osc.frequency.value * (0.985 + Math.random() * 0.03),
            ctx.currentTime, 4);
        });
      },
      pause: function () {
        playing = false;
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      },
      elapsed: function () { return playing && startedAt ? ctx.currentTime - startedAt : 0; },
      levels: function (out) { analyser.getByteTimeDomainData(out); return out; }
    };
  }

  /* --- real audio file ---------------------------------------------------- */
  function createFilePlayer(src) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var el = document.createElement('audio');
    el.src = src;
    el.preload = 'metadata';
    el.crossOrigin = 'anonymous';
    var ctx = new Ctx();
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    var source = ctx.createMediaElementSource(el);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    return {
      kind: 'file',
      analyser: analyser,
      element: el,
      isPlaying: function () { return !el.paused && !el.ended; },
      play: function () { if (ctx.state === 'suspended') ctx.resume(); el.play(); },
      pause: function () { el.pause(); },
      elapsed: function () { return el.currentTime; },
      duration: function () { return isFinite(el.duration) ? el.duration : 0; },
      levels: function (out) { analyser.getByteFrequencyData(out); return out; }
    };
  }

  window.PRESS.Audio = {
    supported: supported,
    create: function (src) {
      if (!supported()) return null;
      try {
        return src ? createFilePlayer(src) : createSynth();
      } catch (e) {
        return null;
      }
    }
  };
})();
