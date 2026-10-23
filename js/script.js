(function () {
  var header = document.querySelector('.site-header');
  var trigger = document.querySelector('.nav-trigger');
  var panel = document.getElementById('nav-panel');

  function closeNav() {
    header.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openNav() {
    header.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  trigger.addEventListener('click', function () {
    var isOpen = header.classList.contains('is-open');
    isOpen ? closeNav() : openNav();
  });

  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) closeNav();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });
})();

(function () {
  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var images = carousel.querySelectorAll('.media-frame__images img');
    var prevBtn = carousel.querySelector('[data-carousel-prev]');
    var nextBtn = carousel.querySelector('[data-carousel-next]');
    var indexEl = carousel.querySelector('[data-carousel-index]');
    var captionEl = carousel.querySelector('[data-carousel-caption]');
    if (!images.length) return;
    var current = 0;
    var autoplayTimer = null;

    function show(index) {
      restartAutoplay();
      current = (index + images.length) % images.length;
      images.forEach(function (img, i) {
        img.classList.toggle('is-active', i === current);
      });
      if (indexEl) {
        indexEl.textContent = String(current + 1).padStart(2, '0');
      }
      if (captionEl) {
        var caption = images[current].getAttribute('data-caption');
        if (caption) captionEl.textContent = caption;
      }
    }

    // advance on its own after 5s; any manual change restarts the countdown
    function restartAutoplay() {
      if (images.length < 2) return;
      clearTimeout(autoplayTimer);
      autoplayTimer = setTimeout(function () { show(current + 1); }, 5000);
    }
    restartAutoplay();

    if (prevBtn) prevBtn.addEventListener('click', function () { show(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(current + 1); });

    var frame = carousel.querySelector('.media-frame__images');
    if (frame && images.length > 1) {
      var isLeftHalf = function (event) {
        var rect = frame.getBoundingClientRect();
        return event.clientX - rect.left < rect.width / 2;
      };
      frame.addEventListener('click', function (event) {
        show(current + (isLeftHalf(event) ? -1 : 1));
      });
      frame.addEventListener('mousemove', function (event) {
        frame.setAttribute('data-hover-side', isLeftHalf(event) ? 'prev' : 'next');
      });
      frame.addEventListener('mouseleave', function () {
        frame.removeAttribute('data-hover-side');
      });
    }

    carousel.showSlide = show;
  });
})();

(function () {
  var rooms = document.querySelectorAll('.final-result__room-link');
  var resultCarousel = document.querySelector('.final-result [data-carousel]');
  rooms.forEach(function (room) {
    room.addEventListener('click', function () {
      rooms.forEach(function (r) { r.classList.remove('is-active'); });
      room.classList.add('is-active');

      var jumpTo = room.getAttribute('data-jump-to-image');
      if (jumpTo !== null && resultCarousel && resultCarousel.showSlide) {
        resultCarousel.showSlide(parseInt(jumpTo, 10));
      }
    });
  });
})();

(function () {
  // landing page: "Change Design" switches between the two designs and remembers the choice
  var buttons = document.querySelectorAll('[data-change-design]');
  if (!buttons.length) return;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FADE_MS = 350; // matches the opacity transition on .theme-landing main in css
  var busy = false;

  function setDesign(alt) {
    root.classList.toggle('design-alt', alt);
    try { localStorage.setItem('landingDesign', alt ? 'alt' : ''); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function fadeTo(alt, done) {
    root.classList.add('design-switching');
    setTimeout(function () {
      setDesign(alt);
      setTimeout(function () {
        root.classList.remove('design-switching');
        if (done) done();
      }, 30);
    }, FADE_MS);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (busy) return;
      var toAlt = !root.classList.contains('design-alt');
      var pattern = window.landingPattern;
      if (reduceMotion || !pattern) {
        setDesign(toAlt);
        if (toAlt && pattern) pattern.show();
        return;
      }
      busy = true;
      // the text travels to its new place while the pattern unfolds / folds up at the same time
      var patternMs = 0;
      function update() {
        setDesign(toAlt);
        if (toAlt) pattern.show();
        else patternMs = pattern.hide();
      }
      function finish() { setTimeout(function () { busy = false; }, patternMs); }
      if (document.startViewTransition) {
        document.startViewTransition(update).finished.then(finish, finish);
      } else {
        // no view transitions: the page fades instead of the text travelling
        if (!toAlt) patternMs = pattern.hide();
        fadeTo(toAlt, function () { if (toAlt) pattern.show(); finish(); });
      }
    });
  });
})();

(function () {
  // landing page, second design: generated pixel pattern.
  // Desktop: the shape from the Figma frame (band along the top, column down the right edge,
  // band along the bottom resting on the project list) framing the intro text.
  // Phones: a looser pattern on the right half, around the text.
  // Each cell's look comes from a hash of its position, so the pattern stays the same on reload.
  var main = document.querySelector('.landing-alt');
  var svg = document.querySelector('.alt-pattern');
  if (!main || !svg) return;

  function hash(i, j, salt) {
    var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(salt, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y, salt) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = hash(i, j, salt), b = hash(i + 1, j, salt), c = hash(i, j + 1, salt), d = hash(i + 1, j + 1, salt);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  var STEPS = 20, STEP_MS = 40, CELL_FADE_MS = 250; // keep CELL_FADE_MS in sync with .alt-pattern g in css

  // depth of a point inside a rectangle, in cells (negative = outside)
  function depth(x, y, r, cell) {
    return Math.min(x - r.l, r.r - x, y - r.t, r.b - y) / cell;
  }

  function draw() {
    if (!main.offsetParent) return; // the first design is showing
    var mainRect = main.getBoundingClientRect();
    var svgRect = svg.getBoundingClientRect();
    var W = Math.round(mainRect.width);
    var mobile = W < 700;
    var cell = mobile ? 12 : Math.max(12, Math.round(W / 90));
    var end = main.querySelector('[data-pattern-end]');
    var H = Math.round((end ? end.getBoundingClientRect().top : mainRect.bottom) - svgRect.top);
    if (H <= 0) return;

    var boxes = [];
    main.querySelectorAll('[data-pattern-avoid]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      boxes.push({
        l: r.left - svgRect.left, r: r.right - svgRect.left, t: r.top - svgRect.top, b: r.bottom - svgRect.top,
        circle: el.getAttribute('data-pattern-avoid') === 'circle' // round gap instead of a rectangle
      });
    });
    var aside = main.querySelector('.alt-hero__aside');
    var asideLeft = aside ? aside.getBoundingClientRect().left - svgRect.left : W / 2;

    // desktop shape, measured from the 1440px Figma frame and scaled with the width
    var s = W / 1440;
    var shape = [
      { l: Math.max(asideLeft + 90 * s, 0.5 * W), r: W + cell, t: -cell, b: 80 * s },   // band along the top
      { l: 0.6 * W, r: 0.86 * W, t: -cell, b: 160 * s },                                 // its ragged lower edge
      { l: 0.85 * W, r: W + cell, t: -cell, b: 550 * s },                                // column down the right
      { l: 0.757 * W, r: 0.896 * W, t: H - 295 * s, b: H },                              // block above the list
      { l: asideLeft, r: 0.896 * W, t: H - 155 * s, b: H }                               // band resting on the list
    ];

    function weight(x, y) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var w = 0;
      if (mobile) {
        if (cx < W * 0.5) return 0;
        var near = 0;
        for (var k = 0; k < boxes.length; k++) {
          var bx = boxes[k];
          var dx = Math.max(bx.l - cx, 0, cx - bx.r), dy = Math.max(bx.t - cy, 0, cy - bx.b);
          near = Math.max(near, 1 - Math.sqrt(dx * dx + dy * dy) / (cell * 7));
        }
        return clamp01(near) * clamp01((cx - W * 0.5) / (cell * 3));
      }
      for (var m = 0; m < shape.length; m++) {
        w = Math.max(w, clamp01((depth(cx, cy, shape[m], cell) + 1.5) / 3)); // edges fray over ~3 cells
      }
      return w;
    }

    // cells are grouped into steps by their distance from the "Change Design" button,
    // so the pattern can unfold out of the button and fold back into it
    var btn = main.querySelector('.alt-change');
    var br = btn ? btn.getBoundingClientRect() : null;
    var ox = br ? (br.left + br.right) / 2 - svgRect.left : W;
    var oy = br ? (br.top + br.bottom) / 2 - svgRect.top : 0;
    var cells = [], maxDist = 1;
    function square(x, y, c) { return 'M' + x + ' ' + y + 'h' + c + 'v' + c + 'h' + (-c) + 'Z'; }
    for (var j = 0; j * cell < H; j++) {
      for (var i = 0; i * cell < W; i++) {
        var x = i * cell, y = j * cell, c = cell;
        var w = weight(x, y);
        if (w <= 0) continue;
        // keep a clear margin around the text
        var blocked = false;
        for (var k = 0; k < boxes.length && !blocked; k++) {
          var bx = boxes[k], g = cell * 0.75;
          if (bx.circle) {
            var rad = (bx.r - bx.l) / 2 + g;
            var ccx = (bx.l + bx.r) / 2, ccy = (bx.t + bx.b) / 2;
            var nx = Math.max(x, Math.min(ccx, x + c)), ny = Math.max(y, Math.min(ccy, y + c)); // nearest point of the cell
            blocked = (nx - ccx) * (nx - ccx) + (ny - ccy) * (ny - ccy) < rad * rad;
          } else {
            blocked = x + c > bx.l - g && x < bx.r + g && y + c > bx.t - g && y < bx.b + g;
          }
        }
        if (blocked) continue;
        // frayed edges: cells drop out more often near the outline of the shape
        if (hash(i, j, 2) > w * 1.15) continue;
        var fill = '', stroke = '';

        var n = noise(i / 5, j / 5, 1);        // large solid blocks
        var t = noise(i / 2.5, j / 2.5, 7);    // finer texture
        var pick = hash(i, j, 3);
        var inner = w > 0.8;

        if (inner && n > 0.66) {
          // solid block, now and then with a white square punched out (as in the Figma pattern)
          fill += square(x, y, c);
          if (pick < 0.18) {
            var hs = c * 0.3;
            fill += 'M' + (x + hs) + ' ' + (y + hs) + 'v' + (c - 2 * hs) + 'h' + (c - 2 * hs) + 'v' + (2 * hs - c) + 'Z';
          }
        } else if (pick < 0.16 + 0.1 * t) {
          fill += square(x, y, c);
        } else if (pick < 0.44) {
          var corner = Math.floor(hash(i, j, 4) * 4);
          var pts = [[x, y], [x + c, y], [x + c, y + c], [x, y + c]];
          pts.splice(corner, 1);
          fill += 'M' + pts[0].join(' ') + 'L' + pts[1].join(' ') + 'L' + pts[2].join(' ') + 'Z';
        } else if (pick < 0.56) {
          var ds = c * 0.3;
          fill += 'M' + (x + ds) + ' ' + (y + ds) + 'h' + (c - 2 * ds) + 'v' + (c - 2 * ds) + 'h' + (2 * ds - c) + 'Z';
          if (hash(i, j, 5) < 0.4) stroke += square(x + 0.5, y + 0.5, c - 1);
        } else if (pick < 0.66) {
          var mid = c / 2;
          if (hash(i, j, 6) < 0.5) {
            fill += 'M' + x + ' ' + y + 'L' + (x + mid) + ' ' + (y + mid) + 'L' + x + ' ' + (y + c) + 'Z' +
                    'M' + (x + c) + ' ' + y + 'L' + (x + mid) + ' ' + (y + mid) + 'L' + (x + c) + ' ' + (y + c) + 'Z';
          } else {
            fill += 'M' + x + ' ' + y + 'L' + (x + mid) + ' ' + (y + mid) + 'L' + (x + c) + ' ' + y + 'Z' +
                    'M' + x + ' ' + (y + c) + 'L' + (x + mid) + ' ' + (y + mid) + 'L' + (x + c) + ' ' + (y + c) + 'Z';
          }
        } else {
          // the thin outlined grid cells
          stroke += square(x + 0.5, y + 0.5, c - 1);
        }
        var dist = Math.hypot(x + c / 2 - ox, y + c / 2 - oy);
        maxDist = Math.max(maxDist, dist);
        cells.push({ d: dist, jitter: hash(i, j, 8) - 0.5, fill: fill, stroke: stroke });
      }
    }
    // spread the cells over all steps, nearest to the button first
    var fills = [], strokes = [];
    for (var st = 0; st < STEPS; st++) { fills.push(''); strokes.push(''); }
    cells.forEach(function (cl) {
      var step = Math.min(STEPS - 1, Math.max(0, Math.round(cl.d / maxDist * (STEPS - 1) + cl.jitter * 2)));
      fills[step] += cl.fill;
      strokes[step] += cl.stroke;
    });
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var groups = '';
    for (var g = 0; g < STEPS; g++) {
      if (!fills[g] && !strokes[g]) continue;
      groups += '<g style="--d-in:' + g * STEP_MS + 'ms;--d-out:' + (STEPS - 1 - g) * STEP_MS + 'ms">' +
        '<path fill="#1D13FF" fill-rule="evenodd" d="' + fills[g] + '"/>' +
        '<path fill="none" stroke="#1D13FF" stroke-width="1" d="' + strokes[g] + '"/></g>';
    }
    svg.innerHTML = groups;
  }

  // redraws (resize, fonts loaded) replace the pattern in place without replaying the animation
  function redraw() {
    var shown = svg.classList.contains('is-shown');
    if (shown) svg.classList.add('is-static');
    draw();
    if (shown) setTimeout(function () { svg.classList.remove('is-static'); }, 50);
  }
  function show() {
    draw();
    svg.getBoundingClientRect(); // start from the hidden state so the cells animate in
    svg.classList.add('is-shown');
  }
  // folds the pattern back up; returns how long that takes
  function hide() {
    svg.classList.remove('is-shown');
    return STEPS * STEP_MS + CELL_FADE_MS;
  }
  window.landingPattern = { show: show, hide: hide };

  var timer;
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(redraw, 120); });
  if (main.offsetParent) show(); // the second design is active on load
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();

(function () {
  // Moving between project pages (and About me), and between them and the landing page:
  // the colours glide from the old page's to the new one's, and the big title and subtitle
  // scramble from the old text into the new.
  var PROJECTS = ['entangled-in-democracy.html', 'mumuth.html', 'c2c2.html', 'saxxella.html', 'under-pressure.html', 'about.html'];
  var KEY = 'projectSwitch';
  var VARS = ['--gradient-rgb', '--gradient-mid-rgb', '--gradient-soft-rgb', '--color-accent', '--color-accent-2'];
  var COLOR_MS = 1600, TEXT_MS = 1200, FLICKER_MS = 55; // FLICKER_MS: how long each random character stays

  function pageName(url) { return url.pathname.split('/').pop() || 'index.html'; }
  var here = pageName(window.location);
  var isLanding = here === 'index.html';
  if (PROJECTS.indexOf(here) === -1 && !isLanding) return;
  var body = document.body;
  // landing page: "Digital meets space." in whichever of its two designs is showing
  var titleLines = isLanding
    ? document.querySelectorAll(document.documentElement.classList.contains('design-alt') ? '.alt-title__line' : '.landing-claim__word')
    : document.querySelectorAll('.hero__title-line, .about-intro__word'); // About me: "Digital Meets Space"
  var subLines = document.querySelectorAll('.hero__subtitle-line');
  function texts(list) { return Array.prototype.map.call(list, function (el) { return el.textContent; }); }

  // colours as [r, g, b]: the gradient variables hold "r,g,b", the accents a hex or rgb() colour
  function toRgb(value) {
    value = value.trim();
    if (/^\d/.test(value)) return value.split(',').map(Number);
    var probe = document.createElement('span');
    probe.style.color = value;
    body.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
    probe.remove();
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function currentColors() {
    var cs = getComputedStyle(body);
    return VARS.map(function (v) { return toRgb(cs.getPropertyValue(v)); });
  }

  // before leaving: remember this page's colours and hero text
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var url = new URL(a.href, window.location.href);
    var to = pageName(url);
    if (to === here || (PROJECTS.indexOf(to) === -1 && to !== 'index.html')) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ to: to, colors: currentColors(), title: texts(titleLines), sub: texts(subLines) }));
    } catch (err) {}
  }, true);

  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (err) {}
  if (!saved || saved.to !== here) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // colours: start with the old project's values (set before the first paint) and glide over
  var from = saved.colors, to = currentColors();
  function setColors(t) {
    VARS.forEach(function (v, k) {
      var c = from[k].map(function (a, n) { return Math.round(a + (to[k][n] - a) * t); });
      body.style.setProperty(v, k < 3 ? c.join(',') : 'rgb(' + c.join(',') + ')');
    });
  }
  setColors(0);

  // text: each character flickers through random characters, then settles on the new one, left to right
  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&#*+-/', LOWER = 'abcdefghijklmnopqrstuvwxyz0123456789&#*+-/';
  function scrambleSetup(list, old, glyphs) {
    return Array.prototype.map.call(list, function (el, i) {
      var target = el.textContent, before = old[i] || '';
      el.parentNode.setAttribute('aria-label', texts(list).join(' '));
      // lowercase text (e.g. the landing page's "Digital meets space.") flickers through lowercase letters
      if (/[a-z]/.test(target) && !/[A-Z]{2}/.test(getComputedStyle(el).textTransform === 'uppercase' ? 'XX' : target)) glyphs = LOWER;
      // html: original markup, restored afterwards so line breaks inside the title (e.g. Under / Pressure) survive
      return { el: el, html: el.innerHTML, target: target, before: before, len: Math.max(target.length, before.length), glyphs: glyphs };
    });
  }
  var jobs = scrambleSetup(titleLines, saved.title || [], UPPER).concat(scrambleSetup(subLines, saved.sub || [], LOWER));

  // all other text on the first screen scrambles in from random characters too
  // (text nodes, so links, line breaks and markup stay intact)
  var claimed = jobs.map(function (job) { return job.el; });
  var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      var el = node.parentElement;
      if (!el || !/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      if (el.closest('script, style, svg, [aria-hidden="true"], .site-header')) return NodeFilter.FILTER_REJECT; // the header stays still
      for (var c = 0; c < claimed.length; c++) if (claimed[c].contains(el)) return NodeFilter.FILTER_REJECT;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return NodeFilter.FILTER_REJECT; // only what is on screen
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  for (var node = walker.nextNode(); node; node = walker.nextNode()) {
    var parent = node.parentElement, text = node.nodeValue;
    if (!parent.hasAttribute('aria-label') && parent.childNodes.length === 1) parent.setAttribute('aria-label', parent.textContent.trim());
    var upper = getComputedStyle(parent).textTransform === 'uppercase' || !/[a-z]/.test(text);
    jobs.push({ node: node, target: text, before: '', len: text.length, glyphs: upper ? UPPER : LOWER });
  }
  function renderText(t) {
    jobs.forEach(function (job) {
      var out = '';
      for (var k = 0; k < job.len; k++) {
        var start = (k / job.len) * 0.35, settle = 0.35 + (k / job.len) * 0.6;
        var finalChar = job.target.charAt(k);
        if (t >= settle) out += finalChar;
        else if (t < start) out += job.node ? (finalChar.trim() ? '\u00a0' : finalChar) : job.before.charAt(k); // other text: blank until it starts flickering
        else out += finalChar === ' ' ? ' ' : job.glyphs.charAt(Math.floor(Math.random() * job.glyphs.length));
      }
      if (job.node) job.node.nodeValue = out; else job.el.textContent = out;
    });
  }
  renderText(0);

  var t0 = performance.now(), lastTick = -1;
  function frame() {
    var elapsed = performance.now() - t0;
    var tc = Math.min(1, elapsed / COLOR_MS), tt = Math.min(1, elapsed / TEXT_MS);
    setColors(ease(tc));
    var tick = Math.floor(elapsed / FLICKER_MS);
    if (tick !== lastTick || tt >= 1) { renderText(tt); lastTick = tick; }
    if (tc < 1 || tt < 1) { requestAnimationFrame(frame); return; }
    VARS.forEach(function (v) { body.style.removeProperty(v); });
    jobs.forEach(function (job) { if (job.node) job.node.nodeValue = job.target; else job.el.innerHTML = job.html; });
  }
  requestAnimationFrame(frame);
})();
