// ScrollTrace site motion. Everything here is decoration on top of readable HTML.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. Drift → Focus field ---------- */
  var cv = $('#field');
  var cells = [], cols = 0, rows = 0, ctx, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var SIZE = 34, GAP = 4, mouse = { x: -999, y: -999 };

  function layout() {
    if (!cv) return;
    var w = window.innerWidth, h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / (SIZE + GAP)); rows = Math.ceil(h / (SIZE + GAP));
    cells = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var r = Math.random();
      cells.push({ x: x, y: y, r: r, drift: r > 0.8, thr: (y / rows) * 0.8 + Math.random() * 0.2, v: r > 0.8 ? -1 : 0, h: 0 });
    }
  }

  function progress() {
    var max = doc.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }

  function draw() {
    if (!ctx) return;
    var p = progress(), w = window.innerWidth, h = window.innerHeight, t = performance.now() / 1000;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var target = p > c.thr ? 1 : (c.drift ? -1 : 0); // 1 focus, -1 drift, 0 idle
      c.v += (target - c.v) * 0.08;
      var px = c.x * (SIZE + GAP) + GAP, py = c.y * (SIZE + GAP) + GAP;
      var dx = px + SIZE / 2 - mouse.x, dy = py + SIZE / 2 - mouse.y;
      var near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 160);
      c.h += (near - c.h) * 0.15;
      var flick = c.drift && c.v < -0.5 ? 0.75 + 0.25 * Math.sin(t * 1.6 + c.r * 40) : 1;
      var col;
      if (c.v > 0.02) col = 'rgba(10,132,255,' + (0.12 + c.v * 0.55 * (0.4 + c.r * 0.6)).toFixed(3) + ')';
      else if (c.v < -0.02) col = 'rgba(255,59,48,' + (-c.v * 0.45 * flick).toFixed(3) + ')';
      else col = 'rgba(255,255,255,0.035)';
      ctx.fillStyle = col;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, SIZE, SIZE, 3); else ctx.rect(px, py, SIZE, SIZE);
      ctx.fill();
      if (c.h > 0.02) { ctx.fillStyle = 'rgba(255,255,255,' + (c.h * 0.22).toFixed(3) + ')'; ctx.fill(); }
    }
  }

  /* ---------- 2. HUD: the page traces your scroll ---------- */
  var M_PER_PX = 0.0254 / 96;          // CSS px → metres
  var travelled = 0, lastY = window.scrollY;
  var elRec = $('#hud-rec'), elDepth = $('#hud-depth'), elReels = $('#hud-reels');
  var mDepth = $('#m-depth'), mReels = $('#m-reels'), mTime = $('#m-time');
  var logoDot = $('.logo i'), started = Date.now();
  var gFill = $('.gauge .fill'), gKnob = $('.gauge .knob');

  function hud() {
    var y = window.scrollY;
    travelled += Math.abs(y - lastY); lastY = y;
    var p = progress();
    var metres = travelled * M_PER_PX;
    var reels = Math.floor(travelled / Math.max(400, window.innerHeight));
    if (elRec) elRec.textContent = Math.round(40 + p * 60) + '%';
    if (elDepth) elDepth.textContent = metres.toFixed(2) + ' m';
    if (elReels) elReels.textContent = reels;
    if (mDepth) mDepth.firstChild.nodeValue = metres.toFixed(1);
    if (mReels) mReels.textContent = reels;
    if (logoDot) { logoDot.style.background = p > 0.5 ? 'var(--focus)' : 'var(--drift)'; logoDot.style.boxShadow = '0 0 12px ' + (p > 0.5 ? 'var(--focus)' : 'var(--drift)'); }
    if (gFill) {
      gFill.style.height = (p * 100) + '%'; gKnob.style.top = (p * 100) + '%';
      var lbls = $$('.gauge .lbl'), cur = null;
      lbls.forEach(function (l) { if (p + 0.02 >= l.__p) cur = l; });
      lbls.forEach(function (l) { l.classList.toggle('on', l === cur); l.style.top = ((l === cur ? p : l.__p) * 100) + '%'; });
    }
  }
  if (mTime) setInterval(function () {
    var s = Math.floor((Date.now() - started) / 1000);
    mTime.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }, 1000);

  // Gauge section labels
  var gauge = $('.gauge');
  if (gauge) {
    var marks = $$('[data-gauge]');
    var total = doc.scrollHeight - window.innerHeight;
    marks.forEach(function (m) {
      var l = document.createElement('span'); l.className = 'lbl';
      l.textContent = m.getAttribute('data-gauge');
      var pos = Math.min(1, Math.max(0, (m.offsetTop - window.innerHeight * 0.2) / total));
      l.style.top = pos * 100 + '%'; l.__p = pos;
      gauge.appendChild(l);
    });
  }

  /* ---------- 3. Reveal + data tiles on view ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.__run) e.target.__run();
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  $$('.rv').forEach(function (el, i) { if (io && !reduce) io.observe(el); else el.classList.add('in'); });

  function onView(el, fn) { if (!el) return; if (io && !reduce) { el.__run = fn; io.observe(el); } else fn(); }

  // Heatmap: 7 days x 24 h, evening and late-night heavy (illustrative)
  var heat = $('.heat');
  if (heat) {
    for (var d = 0; d < 7 * 24; d++) heat.appendChild(document.createElement('i'));
    onView(heat, function () {
      $$('i', heat).forEach(function (c, i) {
        var hr = i % 24;
        var base = hr >= 21 || hr <= 1 ? 0.85 : hr >= 13 && hr <= 14 ? 0.55 : hr >= 7 && hr <= 8 ? 0.35 : hr >= 2 && hr <= 6 ? 0.02 : 0.15;
        var v = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.35));
        setTimeout(function () {
          c.style.background = v > 0.6 ? 'rgba(255,59,48,' + v + ')' : v > 0.25 ? 'rgba(255,59,48,' + (v * 0.6) + ')' : 'rgba(255,255,255,' + (0.04 + v * 0.2) + ')';
        }, reduce ? 0 : hr * 22 + Math.random() * 120);
      });
    });
  }
  // Bars
  $$('.bars').forEach(function (b) { onView(b, function () { $$('.bar span', b).forEach(function (s) { s.style.width = s.getAttribute('data-w'); }); }); });
  // Ring
  var ring = $('.ring .fg');
  if (ring) onView(ring.closest('.tile'), function () {
    ring.style.strokeDashoffset = 402 * (1 - 0.82);
    setTimeout(function () { ring.style.stroke = 'var(--drift)'; }, reduce ? 0 : 1300);
  });
  // Spark path draw
  var spark = $('.spark path.l');
  if (spark) {
    var len = spark.getTotalLength(); spark.style.strokeDasharray = len; spark.style.strokeDashoffset = len;
    spark.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
    onView(spark.closest('.tile'), function () { spark.style.strokeDashoffset = 0; });
  }

  /* ---------- 4. Hero phone: auto-swiping Reels with a live count ---------- */
  var reels = $('.reels');
  if (reels) {
    var hues = [[255, 59, 48], [255, 149, 0], [175, 82, 222], [255, 45, 85], [10, 132, 255], [48, 209, 88], [94, 92, 230]];
    var N = 8;
    for (var k = 0; k < N; k++) {
      var c1 = hues[k % hues.length], c2 = hues[(k + 3) % hues.length];
      var r = document.createElement('div'); r.className = 'reel';
      r.style.background = 'radial-gradient(120% 70% at ' + (20 + k * 9) + '% ' + (10 + k * 7) + '%, rgba(' + c1 + ',.85), transparent 60%), radial-gradient(90% 60% at 90% 90%, rgba(' + c2 + ',.6), transparent 60%), #0a0a0a';
      r.innerHTML = '<div class="cap"><i></i><i></i><i></i></div><div class="side"><b></b><b></b><b></b></div>';
      reels.appendChild(r);
    }
    reels.appendChild(reels.firstElementChild.cloneNode(true)); // seamless loop
    var idx = 0, count = 11, LIMIT = 20;
    var vC = $('#ph-count'), vT = $('#ph-time'), lim = $('.limit span'), toast = $('.toast'), stage = $('.phone-stage');
    function render() {
      vC.textContent = count;
      var s = count * 22; vT.textContent = Math.floor(s / 60) + 'm ' + ('0' + s % 60).slice(-2) + 's';
      lim.style.width = Math.min(100, count / LIMIT * 100) + '%';
      lim.style.background = count >= LIMIT ? 'var(--drift)' : 'var(--focus)';
    }
    render();
    if (!reduce) setInterval(function () {
      if (document.hidden) return;
      if (count >= LIMIT) { // show alert, then reset to a calmer day
        toast.classList.add('on'); stage.classList.add('calm');
        setTimeout(function () { toast.classList.remove('on'); }, 2600);
        setTimeout(function () { count = 3; stage.classList.remove('calm'); render(); }, 3400);
        count++; return;
      }
      if (count > LIMIT) return;
      idx++; count++;
      reels.style.transition = ''; reels.style.transform = 'translateY(' + (-idx * 100) + '%)';
      if (idx === N) setTimeout(function () { reels.style.transition = 'none'; idx = 0; reels.style.transform = 'translateY(0)'; }, 600);
      render();
    }, 1700);
  }

  /* ---------- Loop ---------- */
  if (cv && !reduce) {
    layout(); draw(); hud();
    window.addEventListener('resize', function () { layout(); draw(); });
    window.addEventListener('scroll', function () { if (document.hidden) { draw(); hud(); } }, { passive: true });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    (function loop() { if (!document.hidden) { draw(); hud(); } requestAnimationFrame(loop); })();
  } else {
    if (cv) { layout(); draw(); }
    window.addEventListener('scroll', hud, { passive: true }); hud();
  }

  /* ---------- Contact form (about page) ---------- */
  var form = $('#contact-form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('#contact-status'), btn = form.querySelector('button');
    btn.disabled = true; st.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) })
      .then(function (r) { st.textContent = r.ok ? 'Received. Badal will reply soon.' : 'Something went wrong. Try again.'; if (r.ok) form.reset(); })
      .catch(function () { st.textContent = 'Network error. Try again.'; })
      .finally(function () { btn.disabled = false; });
  });
})();
