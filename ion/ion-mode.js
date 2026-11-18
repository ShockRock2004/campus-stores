/* ==========================================================================
   Ion: ion-mode.js — light / dark mode
   Load in <head> WITHOUT defer/async so the stored mode applies before first paint:
     <script src="ion/ion-mode.js"></script>
   Modes: "system" (default, follows the OS) · "light" · "dark"
     → sets <html data-theme="light|dark"> (removed for system); ion.css swaps every token.
   Controls (any number, anywhere):
     <button data-theme-toggle></button>    blind-pull toggle:
                                           pull the cord → slats fold shut, mode flips, slats reopen.
                                           data-size="sm|lg" (32 / 64px; default 40px)
     <div class="ion-segmented" data-theme-select></div>              System / Light / Dark
   Event: document "themechange" → e.detail = { mode, theme } (theme = resolved "light" | "dark")
   API:   Ion.theme.set("light" | "dark" | "system"), .mode(), .current()
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "ion:mode";
  var root = document.documentElement;
  var mql = window.matchMedia("(prefers-color-scheme: light)");
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { v === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }
  };
  function apply(mode) { if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode); else root.removeAttribute("data-theme"); }
  function mode() { var m = store.get(); return m === "light" || m === "dark" ? m : "system"; }
  function current() { var t = root.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : (mql.matches ? "light" : "dark"); }

  apply(mode()); /* before first paint */

  var ICONS = {
    sun: '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    moon: '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
  };

  function notify() {
    document.dispatchEvent(new CustomEvent("themechange", { detail: { mode: mode(), theme: current() } }));
    sync();
  }
  var reduced = function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; };
  function set(next, instant) {
    var run = function () { store.set(next); apply(next); notify(); };
    /* View Transitions: one GPU cross-fade of the whole page instead of transitioning every color */
    if (!instant && document.startViewTransition && !reduced()) document.startViewTransition(run); else run();
  }

  /* Blind-pull toggle ------------------------------------------------------
     6 slats each clip the same full-size face, so the icon looks whole until the
     slats fold (scaleY) one after another. Cord + knob stretch and spring back.
     Transform-only (WAAPI); the mode flips while the blind is shut (no page cross-fade,
     the blind IS the transition). Reduced motion: flips instantly. */
  var SLATS = 6;
  function blindMarkup() {
    var face = '<span class="ion-blind__face"><span class="ion-blind__icon ion-blind__sun">' + ICONS.sun + '</span><span class="ion-blind__icon ion-blind__moon">' + ICONS.moon + "</span></span>";
    var slats = "";
    for (var i = 0; i < SLATS; i++) slats += '<span class="ion-blind__slat" style="--i:' + i + '">' + face + "</span>";
    return '<span class="ion-blind__tile">' + slats + '</span><span class="ion-blind__cord" aria-hidden="true"><span class="ion-blind__line"></span><span class="ion-blind__knob"></span></span>';
  }
  function pull(b) {
    var next = current() === "light" ? "dark" : "light";
    if (reduced() || !b.animate) { set(next, true); return; }
    if (b._busy) return;
    b._busy = true;
    var tile = b.querySelector(".ion-blind__tile"), line = b.querySelector(".ion-blind__line"), knob = b.querySelector(".ion-blind__knob");
    var slats = [].slice.call(b.querySelectorAll(".ion-blind__slat"));
    var P = tile.offsetWidth, rest = 0.3 * P, max = 0.65 * P, base = rest / max;
    /* cord: quick stretch to 0.65P, then a spring settle back to 0.3P */
    var pts = [base, 1, 0.38, 0.5, base * 0.97, base];
    var offs = [0, 0.17, 0.45, 0.68, 0.86, 1];
    line.animate(pts.map(function (v, i) { return { transform: "scaleY(" + v + ")", offset: offs[i] }; }), { duration: 620, easing: "ease-out" });
    knob.animate(pts.map(function (v, i) { return { transform: "translateY(" + ((v - base) * max).toFixed(2) + "px)", offset: offs[i] }; }), { duration: 620, easing: "ease-out" });
    var anims = [], flipped = false, done = false;
    var flip = function () { if (!flipped) { flipped = true; set(next, true); } };
    var finish = function () { if (done) return; done = true; clearTimeout(guard); flip(); anims.forEach(function (a) { a.cancel(); }); b._busy = false; };
    var guard = setTimeout(finish, 900); /* safety net: never leave the toggle stuck if animations stall */
    var shut = slats.map(function (sl, i) { return sl.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 100, delay: i * 40, easing: "ease-in", fill: "forwards" }); });
    anims = anims.concat(shut);
    shut[shut.length - 1].finished.then(function () {
      if (done) return;
      flip();
      var open = slats.map(function (sl, i) { return sl.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 130, delay: i * 40, easing: "ease-out", fill: "forwards" }); });
      anims = anims.concat(open);
      return open[open.length - 1].finished;
    }).catch(function () {}).then(finish);
  }
  function sync() {
    var theme = current(), m = mode();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(theme === "light"));
      b.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
      b.title = b.getAttribute("aria-label");
      b.dataset.theme = theme;
    });
    document.querySelectorAll("[data-theme-select] [data-mode]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === m));
    });
  }
  function build() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      if (b.dataset.ready) return; b.dataset.ready = "1";
      b.classList.add("ion-theme-toggle", "ion-blind");
      b.type = "button";
      if (!b.innerHTML.trim()) b.innerHTML = blindMarkup();
      b.addEventListener("click", function () { pull(b); });
    });
    document.querySelectorAll("[data-theme-select]").forEach(function (g) {
      if (g.dataset.ready) return; g.dataset.ready = "1";
      g.classList.add("ion-segmented"); g.setAttribute("role", "group"); if (!g.getAttribute("aria-label")) g.setAttribute("aria-label", "Color mode");
      if (!g.children.length) ["system", "light", "dark"].forEach(function (k) {
        var b = document.createElement("button"); b.type = "button"; b.className = "ion-segmented__item"; b.dataset.mode = k;
        b.textContent = k.charAt(0).toUpperCase() + k.slice(1); g.appendChild(b);
      });
      g.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.mode); }); });
      if (window.Ion && window.Ion.motion) window.Ion.motion.segmented(g);
    });
    sync();
  }
  mql.addEventListener("change", function () { if (mode() === "system") notify(); });
  window.Ion = window.Ion || {};
  window.Ion.theme = { set: function (m) { set(m); }, mode: mode, current: current, init: build };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
