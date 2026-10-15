/**
 * The seasonal particles: one canvas behind the hero, a few dozen shapes,
 * drawn only while the hero is on screen and the tab is visible. Loaded by
 * seasons.js, never when the visitor prefers reduced motion.
 *
 *   halloween  falling leaves and a couple of bats
 *   christmas  snow
 *   carnival   confetti
 *   valentine  drifting hearts
 *   easter     petals
 *   junina     embers rising from a bonfire
 *   newyear    small fireworks
 */
(function (w) {
  'use strict';

  var PALETTE = {
    halloween: ['#E8833A', '#C2582B', '#D9A441', '#8A5A2B'],
    christmas: ['#FFFFFF', '#E9F1FF', '#DCE6F7'],
    carnival: ['#7F57FA', '#FF3D8B', '#FFB35C', '#2BB7A3', '#4C8DF6'],
    valentine: ['#E5486B', '#F27A97', '#C93558'],
    easter: ['#F5B8D0', '#BFD9F7', '#F8E39A', '#C8EBC4'],
    junina: ['#FFB35C', '#FF8A3D', '#FFD27A'],
    newyear: ['#FFB35C', '#FFD27A', '#9B7BFF', '#FF6FA5', '#7FE0D0']
  };

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  w.VoodooSeasonFx = function (host, season) {
    var canvas = document.createElement('canvas');
    canvas.className = 'vd-season-fx';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d');
    var colors = PALETTE[season] || PALETTE.carnival;
    var W = 0, H = 0, parts = [], bursts = [], raf = 0, visible = true, last = 0, nextBurst = 0;

    function size() {
      var r = host.getBoundingClientRect();
      var dpr = Math.min(2, w.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(p, initial) {
      p.x = rand(0, W);
      p.c = colors[(Math.random() * colors.length) | 0];
      p.r = rand(0, 6.28);
      p.vr = rand(-1.5, 1.5);
      p.s = rand(0.7, 1.3);
      p.bat = false;
      if (season === 'junina') {
        p.y = initial ? rand(H * 0.3, H) : H + 10;
        p.vy = rand(-40, -18);
        p.vx = rand(-8, 8);
        p.life = rand(3, 6);
      } else {
        p.y = initial ? rand(-H, H) : rand(-60, -10);
        p.vy = season === 'christmas' ? rand(14, 34) : rand(24, 46);
        p.vx = rand(-12, 12);
        p.life = Infinity;
      }
      return p;
    }

    function dark() {
      var t = document.documentElement.getAttribute('data-theme');
      return t ? t === 'dark' : !!(w.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    }

    function setup() {
      size();
      // White snow vanishes on a light page; it turns a soft winter blue there.
      colors = season === 'christmas' && !dark() ? ['#A9BCE3', '#C4D2EE', '#8FA5D6'] : PALETTE[season] || PALETTE.carnival;
      var n = season === 'newyear' ? 0 : Math.round(Math.min(46, Math.max(18, W / 34)));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn({}, true));
      if (season === 'halloween') {
        for (var b = 0; b < 2; b++) parts.push({ bat: true, x: rand(-200, W), y: rand(30, H * 0.45), vx: rand(36, 60), s: rand(0.8, 1.1), r: rand(0, 6) });
      }
    }

    function shape(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(p.s, p.s);
      ctx.fillStyle = p.c;
      if (season === 'christmas' || season === 'junina') {
        ctx.beginPath();
        ctx.arc(0, 0, season === 'junina' ? 1.8 : 2.4, 0, 6.29);
        ctx.fill();
      } else if (season === 'carnival') {
        ctx.fillRect(-4, -2, 8, 4);
      } else if (season === 'valentine') {
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-7, -2, -3, -7, 0, -3);
        ctx.bezierCurveTo(3, -7, 7, -2, 0, 3);
        ctx.fill();
      } else {
        // a leaf or a petal: a pointed ellipse
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(0, -4, 6, 0);
        ctx.quadraticCurveTo(0, 4, -6, 0);
        ctx.fill();
      }
      ctx.restore();
    }

    function bat(p, t) {
      var flap = Math.sin(t * 12 + p.r) * 5;
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(t * 2 + p.r) * 8);
      ctx.scale(p.s, p.s);
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#3b2a5c' : '#2a1d45';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-8, -6 - flap, -18, -2 - flap);
      ctx.quadraticCurveTo(-12, 0, -10, 4);
      ctx.quadraticCurveTo(-5, 2, 0, 5);
      ctx.quadraticCurveTo(5, 2, 10, 4);
      ctx.quadraticCurveTo(12, 0, 18, -2 - flap);
      ctx.quadraticCurveTo(8, -6 - flap, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    function burst() {
      var x = rand(W * 0.1, W * 0.9), y = rand(H * 0.12, H * 0.45), c = colors[(Math.random() * colors.length) | 0];
      for (var i = 0; i < 26; i++) {
        var a = (i / 26) * 6.283, v = rand(40, 80);
        bursts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.3, c: c });
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      var t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 0.6;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.bat) {
          p.x += p.vx * dt;
          if (p.x > W + 40) {
            p.x = -60;
            p.y = rand(30, H * 0.45);
          }
          bat(p, t);
          ctx.globalAlpha = 0.6;
          continue;
        }
        p.x += (p.vx + Math.sin(t + p.r) * 10) * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        p.life -= dt;
        if (p.y > H + 20 || p.y < -80 || p.life <= 0) spawn(p, false);
        shape(p);
      }
      if (season === 'newyear') {
        if (now > nextBurst) {
          burst();
          nextBurst = now + rand(900, 1800);
        }
        for (var j = bursts.length - 1; j >= 0; j--) {
          var s = bursts[j];
          s.life -= dt;
          if (s.life <= 0) {
            bursts.splice(j, 1);
            continue;
          }
          s.vy += 40 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          ctx.globalAlpha = Math.max(0, s.life / 1.3) * 0.7;
          ctx.fillStyle = s.c;
          ctx.fillRect(s.x - 1.2, s.y - 1.2, 2.4, 2.4);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    function pause() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    setup();
    var io = 'IntersectionObserver' in w ? new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) play();
      else pause();
    }) : null;
    if (io) io.observe(host);
    var onVis = function () {
      if (document.hidden) pause();
      else play();
    };
    var onResize = function () {
      setup();
    };
    document.addEventListener('visibilitychange', onVis);
    w.addEventListener('resize', onResize);
    var mo = new MutationObserver(onResize);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    play();

    return {
      stop: function () {
        pause();
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        w.removeEventListener('resize', onResize);
        mo.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  };
})(window);
