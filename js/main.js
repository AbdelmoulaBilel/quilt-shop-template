/* Thread & Thimble — interactions (no libraries). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var CONTACT_EMAIL = 'hello@threadandthimble.shop'; // where the contact form sends (via email app)

  $('#year').textContent = new Date().getFullYear();

  /* ---- 3D push menu ---- */
  var burger = $('.burger'), menu = $('#menu3d'), stage = $('#stage'), savedY = 0;
  function setMenu(open) {
    if (open) savedY = scrollY;
    document.body.classList.toggle('menu-open', open);
    if (open) { stage.scrollTop = savedY; requestAnimationFrame(function () { stage.scrollTop = savedY; }); }
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (!open) window.scrollTo({ top: savedY, behavior: 'instant' });
    else setTimeout(function () { var a = $('a', menu); if (a) a.focus(); }, 300);
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  stage.addEventListener('click', function (e) {
    if (document.body.classList.contains('menu-open') && !e.target.closest('.burger')) { e.preventDefault(); setMenu(false); }
  }, true);
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); setMenu(false);
      var t = $(a.getAttribute('href')); if (t) setTimeout(function () { t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, 50);
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });

  /* ---- scroll: header, tape measure, back to top ---- */
  var header = $('.header'), fill = $('.tape__fill'), top = $('.to-top');
  function onScroll() {
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('is-solid', y > innerHeight * .6);
    fill.style.width = (max > 0 ? y / max * 100 : 0) + '%';
    top.classList.toggle('is-on', y > 800);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---- rotating headline (3D roll) ---- */
  var words = $$('.rotator span'), wi = 0;
  if (!reduce && words.length > 1) setInterval(function () {
    var cur = words[wi]; cur.classList.remove('is-on'); cur.classList.add('is-out');
    setTimeout(function () { cur.classList.remove('is-out'); }, 800);
    wi = (wi + 1) % words.length; words[wi].classList.add('is-on');
  }, 3600);

  /* ---- hero depth parallax (mouse / phone tilt) ---- */
  var hero = $('.hero'), layers = $$('.hero .layer');
  function depth(x, y) { // x,y in -1..1
    layers.forEach(function (l) {
      var d = +l.getAttribute('data-depth') || 0;
      var base = l.classList.contains('hero__quilt') ? ' translateZ(-30px) scale(1.08)' : '';
      l.style.transform = 'translate3d(' + (-x * d * .4).toFixed(1) + 'px,' + (-y * d * .4).toFixed(1) + 'px,0) rotateY(' + (x * d * .04).toFixed(2) + 'deg) rotateX(' + (-y * d * .04).toFixed(2) + 'deg)' + base;
    });
  }
  if (!reduce) {
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); depth((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); });
    hero.addEventListener('pointerleave', function () { depth(0, 0); });
    addEventListener('deviceorientation', function (e) { if (e.gamma == null) return; depth(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30))); });
  }

  /* ---- needle & thread following the pointer (verlet rope) ---- */
  var cv = $('#thread'), ctx = cv.getContext('2d'), N = 28, SEG = 14, pts = [], target = null, dpr = 1, running = false, idleT = 0;
  function sizeCanvas() { dpr = Math.min(2, devicePixelRatio || 1); cv.width = hero.clientWidth * dpr; cv.height = hero.clientHeight * dpr; }
  function resetRope() {
    pts = []; var x0 = hero.clientWidth * .82, y0 = hero.clientHeight * .18;
    for (var i = 0; i < N; i++) pts.push({ x: x0, y: y0 + i * SEG, px: x0, py: y0 + i * SEG });
  }
  function step() {
    var w = hero.clientWidth, h = hero.clientHeight;
    idleT += .016;
    var head = target || { x: w * .82 + Math.sin(idleT * .9) * 60, y: h * .2 + Math.cos(idleT * 1.3) * 30 };
    pts[0].x += (head.x - pts[0].x) * .35; pts[0].y += (head.y - pts[0].y) * .35;
    for (var i = 1; i < N; i++) { var p = pts[i], vx = (p.x - p.px) * .97, vy = (p.y - p.py) * .97; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + .35; }
    for (var k = 0; k < 6; k++) for (var j = 1; j < N; j++) {
      var a = pts[j - 1], b = pts[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, diff = (d - SEG) / d;
      if (j === 1) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * .5; a.y += dy * diff * .5; b.x -= dx * diff * .5; b.y -= dy * diff * .5; }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    // thread
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var m = 1; m < N - 1; m++) ctx.quadraticCurveTo(pts[m].x, pts[m].y, (pts[m].x + pts[m + 1].x) / 2, (pts[m].y + pts[m + 1].y) / 2);
    ctx.strokeStyle = '#f2b134'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    // needle, pointing along the first segment
    var n0 = pts[0], n1 = pts[1], ang = Math.atan2(n0.y - n1.y, n0.x - n1.x);
    ctx.save(); ctx.translate(n0.x, n0.y); ctx.rotate(ang);
    var g = ctx.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, '#fff'); g.addColorStop(.5, '#b9b4bd'); g.addColorStop(1, '#6e6872');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, -2.6); ctx.lineTo(30, -.6); ctx.lineTo(38, 0); ctx.lineTo(30, .6); ctx.lineTo(-10, 2.6); ctx.quadraticCurveTo(-14, 0, -10, -2.6); ctx.fill();
    ctx.fillStyle = '#2b2230'; ctx.beginPath(); ctx.ellipse(-5, 0, 3.2, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (running) requestAnimationFrame(step);
  }
  if (!reduce) {
    sizeCanvas(); resetRope();
    addEventListener('resize', function () { sizeCanvas(); });
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); target = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    hero.addEventListener('pointerleave', function () { target = null; });
    new IntersectionObserver(function (en) { var vis = en[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(step); } else if (!vis) running = false; }).observe(hero);
  }

  /* ---- 3D tilt on cards & frames ---- */
  if (fine && !reduce) $$('.tilt').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(900px) rotateY(' + (x * 14).toFixed(2) + 'deg) rotateX(' + (-y * 14).toFixed(2) + 'deg) translateZ(10px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  /* ---- flip cards: tap / Enter on touch & keyboard ---- */
  $$('.card3d').forEach(function (c) {
    c.addEventListener('click', function (e) { if (!fine && !e.target.closest('a')) c.classList.toggle('is-flipped'); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('is-flipped'); } });
  });

  /* ---- 3D quilt carousel ---- */
  var ring = $('#ring'), items = $$('figure', ring), angle = 0, vel = 0, dragging = false, lastX = 0, auto = !reduce;
  function radius() { return Math.round((ring.offsetWidth / 2) / Math.tan(Math.PI / items.length)) + 90; }
  function layout() { var r = radius(); items.forEach(function (f, i) { f.style.transform = 'rotateY(' + (i * 360 / items.length) + 'deg) translateZ(' + r + 'px)'; }); ring.dataset.r = r; }
  function render() { ring.style.transform = 'translateZ(' + (-ring.dataset.r) + 'px) rotateY(' + angle + 'deg)'; }
  function loop() {
    if (!dragging) { if (auto) angle -= .08; angle += vel; vel *= .94; }
    render(); requestAnimationFrame(loop);
  }
  layout(); render(); addEventListener('resize', function () { layout(); render(); });
  var rs = $('#ringStage');
  rs.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; vel = 0; rs.setPointerCapture(e.pointerId); });
  rs.addEventListener('pointermove', function (e) { if (!dragging) return; var dx = e.clientX - lastX; lastX = e.clientX; angle += dx * .25; vel = dx * .25; });
  ['pointerup', 'pointercancel'].forEach(function (t) { rs.addEventListener(t, function () { dragging = false; }); });
  function nudge(dir) { auto = false; var stepA = 360 / items.length, startA = angle, endA = Math.round((angle + dir * stepA) / stepA) * stepA, t0 = performance.now();
    (function an(now) { var p = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - p, 3); angle = startA + (endA - startA) * e; if (p < 1) requestAnimationFrame(an); else setTimeout(function () { auto = !reduce; }, 3000); })(t0); }
  $('#ringPrev').addEventListener('click', function () { nudge(1); });
  $('#ringNext').addEventListener('click', function () { nudge(-1); });
  rs.addEventListener('mouseenter', function () { auto = false; });
  rs.addEventListener('mouseleave', function () { auto = !reduce; });
  requestAnimationFrame(loop);

  /* ---- reveal on scroll (+ seam stitching) ---- */
  var targets = $$('[data-reveal], .seam');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else targets.forEach(function (t) { t.classList.add('is-in'); });

  /* ---- forms ---- */
  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, bad = $$('[required]', f).filter(function (i) { return !i.checkValidity(); });
    $$('.is-bad', f).forEach(function (i) { i.classList.remove('is-bad'); });
    if (bad.length) { bad.forEach(function (i) { i.classList.add('is-bad'); }); bad[0].focus(); return; }
    $('.form__msg', f).textContent = 'Thank you! Your email app will open so you can send the note.';
    location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('[' + f.topic.value + '] message from ' + f.name.value) + '&body=' + encodeURIComponent(f.message.value + '\n\n' + f.name.value + ' — ' + f.email.value);
  });
  $('#news').addEventListener('submit', function (e) {
    e.preventDefault(); var b = $('button', e.target); b.textContent = 'Thank you ✂'; b.disabled = true;
  });
})();
