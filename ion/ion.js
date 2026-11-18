/* ==========================================================================
   Ion: ion.js (vanilla, no dependencies)
     0. Motion core     shared glide / hover-pill / swap helpers (Ion.motion)
     1. Glow boxes                                      → [data-glow]
     2. Particles                                       → [data-particles]
     3. Scroll reveal                                   → .ion-reveal
     4. Toggles                                         → .ion-toggle
     5. Pricing                                         → [data-pricing]
     6. Pagination                                      → [data-pagination]
     7. Paginated table                                 → [data-pagination][data-target]
     8. Sidebar (navbar)                                → [data-sidebar-shell]
     9. Secret reveal                                   → [data-secret]
    10. AI loader                                       → .ion-ai-loader
    11. Flux loader                                     → [data-flux]
    12. File upload                                     → [data-upload]
    13. Profile menu                                    → [data-profile]
   Load once at the end of <body>:  <script src="ion/ion.js"></script>
   Re-run on injected markup:        Ion.init(root)
   ========================================================================== */
(function () {
  "use strict";

  /* 0. Motion core -------------------------------------------------------------
     The navbar's feel, shared by every component: one element glides (transform only)
     between targets instead of each target repainting its own background.
       glide(indicator, target, container[, instant])  → move an indicator onto target
       track(container, activeSelector, cls)           → active glider that follows a selector
       hoverPill(container, itemSelector, cls)         → hover pill that fades/unblurs in, then glides
       swap(el, text)                                  → blur-slide text replacement (numbers, labels)
       enter(el)                                       → fade/unblur-in for views that just appeared
     Performance: transform/opacity/filter only, rAF-batched reads before writes,
     no animation when prefers-reduced-motion. */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function glide(ind, target, container, instant) {
    if (!target || !target.isConnected || target.offsetParent === null) { ind.classList.remove("is-on"); return; }
    const c = container.getBoundingClientRect(), t = target.getBoundingClientRect();
    if (!t.width) { ind.classList.remove("is-on"); return; }
    const x = t.left - c.left - container.clientLeft + container.scrollLeft;
    const y = t.top - c.top - container.clientTop + container.scrollTop;
    const jump = instant || !ind.classList.contains("is-on") || reduceMotion.matches;
    if (jump) ind.style.transition = "none";
    ind.style.width = t.width + "px";
    ind.style.height = t.height + "px";
    ind.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ind.classList.add("is-on");
    if (jump) { void ind.offsetWidth; ind.style.transition = ""; }
  }
  function makeLayer(container, cls) {
    const e = document.createElement("span");
    e.className = "ion-motion " + cls; e.setAttribute("aria-hidden", "true");
    container.prepend(e);
    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    return e;
  }
  function track(container, activeSelector, cls) {
    if (container._track) { container._track(); return container._track; }
    const ind = makeLayer(container, cls || "ion-motion--active");
    let raf = 0, jump = false;
    /* coalesced to one rAF; an "instant" request in the same frame wins over a glide */
    const place = instant => { jump = jump || !!instant; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { glide(ind, container.querySelector(activeSelector), container, jump); jump = false; }); };
    new MutationObserver(() => place()).observe(container, { attributes: true, subtree: true, childList: true, attributeFilter: ["aria-pressed", "aria-current", "class", "data-selected"] });
    new ResizeObserver(() => place(true)).observe(container);
    container.classList.add("has-glider");
    container._track = place;
    place(true);
    return place;
  }
  function hoverPill(container, itemSelector, cls) {
    if (container._pill) return container._pill;
    const pill = makeLayer(container, cls || "ion-motion--hover");
    const api = {
      to(item) { if (item && !item.disabled) glide(pill, item, container); else pill.classList.remove("is-on"); },
      hide() { pill.classList.remove("is-on"); },
      el: pill
    };
    container.addEventListener("pointerover", e => { const it = e.target.closest(itemSelector); if (it && container.contains(it)) api.to(it); });
    container.addEventListener("pointerleave", () => api.hide());
    container.classList.add("has-pill");
    container._pill = api;
    return api;
  }
  function swap(el, text) {
    /* Rapid calls coalesce: one out-animation in flight, and it always writes the LATEST text */
    if ((el._swapping ? el._swapTo : el.textContent) === text) return;
    el._swapTo = text;
    if (reduceMotion.matches || !el.animate || document.hidden) { el.textContent = text; return; }
    if (el._swapping) return;
    el._swapping = true;
    const ease = "cubic-bezier(.22, 1, .36, 1)";
    let out;
    const done = () => {
      if (!el._swapping) return;
      el._swapping = false; out.cancel(); el.textContent = el._swapTo;
      el.animate([{ opacity: 0, transform: "translateY(8px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 260, easing: ease });
    };
    out = el.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(-8px)", filter: "blur(4px)" }], { duration: 140, easing: "ease-in", fill: "forwards" });
    out.finished.then(done, done);
    setTimeout(done, 400); /* fallback if the animation timeline stalls (hidden tab, throttled frame) */
  }
  function enter(el, dy = 6) {
    if (reduceMotion.matches || !el.animate) return;
    el.animate([{ opacity: 0, transform: `translateY(${dy}px)`, filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }
  /* Segmented controls get a gliding active pill (ion-charts.js / ion-calendar.js call this too) */
  function segmentedMotion(root) {
    (root.matches && root.matches(".ion-segmented") ? [root] : [...root.querySelectorAll(".ion-segmented")])
      .forEach(g => track(g, '.ion-segmented__item[aria-pressed="true"]', "ion-motion--segment"));
    /* .ion-segmented[data-segmented]: selection handled here (click, ←/→); fires "change" {value, index} */
    root.querySelectorAll(".ion-segmented[data-segmented]").forEach(g => {
      if (g._seg) return; g._seg = true;
      const items = () => [...g.querySelectorAll(".ion-segmented__item")];
      const pick = b => {
        if (b.getAttribute("aria-pressed") === "true") return;
        items().forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        g.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value: b.dataset.value || b.textContent.trim(), index: items().indexOf(b) } }));
      };
      g.addEventListener("click", e => { const b = e.target.closest(".ion-segmented__item"); if (b && g.contains(b)) pick(b); });
      g.addEventListener("keydown", e => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const all = items(), i = all.indexOf(document.activeElement); if (i < 0) return;
        e.preventDefault(); const n = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length]; n.focus(); pick(n);
      });
    });
  }
  /* Pause continuous CSS animations while off-screen (orbits, ripple, blob, badge sweep, glows) */
  function pauseOffscreen(root) {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("is-paused", !e.isIntersecting)), { rootMargin: "120px" });
    root.querySelectorAll(".ion-orbits, .ion-ripple, .ion-cta__blob, .ion-badge, .ion-frame, .ion-spinner, .ion-ai-loader, .ion-flux, .ion-orb, .ion-prompt").forEach(el => io.observe(el));
  }


  /* 1. Glow boxes ------------------------------------------------------------
     Listens on document (not the card), so every card's
     rim lights up as the cursor approaches. Resets to -size when the cursor
     leaves the window. Perf: only cards in (or near) the viewport are updated,
     all rect reads happen before all style writes, one rAF per frame. */
  function initGlow(root) {
    const cards = [...root.querySelectorAll("[data-glow]")].filter(c => !c._glow);
    if (!cards.length) return;
    cards.forEach(c => { c._glow = true; });
    const size = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glow-size")) || 200;
    const visible = new Set();
    const off = () => { const s = -size() + "px"; return s; };
    const park = c => { const s = off(); c.style.setProperty("--mx", s); c.style.setProperty("--my", s); };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) visible.add(e.target); else { visible.delete(e.target); park(e.target); } }), { rootMargin: "200px" });
      cards.forEach(c => io.observe(c));
    } else cards.forEach(c => visible.add(c));
    let frame = 0, last = null;
    const paint = () => {
      frame = 0;
      const list = [...visible], rects = list.map(c => c.getBoundingClientRect()); // reads
      list.forEach((c, i) => { c.style.setProperty("--mx", (last.clientX - rects[i].left) + "px"); c.style.setProperty("--my", (last.clientY - rects[i].top) + "px"); }); // writes
    };
    document.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; last = e; if (!frame) frame = requestAnimationFrame(paint); }, { passive: true });
    document.addEventListener("mouseout", e => { if (!e.relatedTarget) cards.forEach(park); });
    cards.forEach(park);
  }

  /* 2. Particles -------------------------------------------------------------
     Drifting dots that lean toward the cursor. Options via data attributes:
     data-quantity (100) data-staticity (50) data-ease (50) data-size (.4)
     data-color (default: the theme's --color-particle, follows light/dark) data-vx (0) data-vy (0).
     CTA default: quantity 80, ease 80 (35 on mobile). Perf: the loop stops while
     the canvas is off-screen or the tab is hidden; DPR capped at 2. */
  function initParticles(host) {
    if (host._particles) return;
    host._particles = true;
    const o = host.dataset;
    const mobileQty = o.quantityMobile ? parseInt(o.quantityMobile, 10) : null;
    const opts = {
      quantity: parseInt(o.quantity || 100, 10), staticity: parseFloat(o.staticity || 50), ease: parseFloat(o.ease || 50),
      size: parseFloat(o.size || 0.4), vx: parseFloat(o.vx || 0), vy: parseFloat(o.vy || 0)
    };
    const canvas = document.createElement("canvas");
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0 }, dims = { w: 0, h: 0 };
    let circles = [], raf = 0, quantity = opts.quantity, onScreen = true, rgb = [255, 255, 255];
    const readColor = () => {
      let c = (o.color || getComputedStyle(host).getPropertyValue("--color-particle") || "#ffffff").trim();
      const h = c.replace("#", "").replace(/^(.)(.)(.)$/, "$1$1$2$2$3$3"), n = parseInt(h, 16);
      rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    readColor();
    document.addEventListener("themechange", readColor);

    const params = () => ({
      x: Math.floor(Math.random() * dims.w), y: Math.floor(Math.random() * dims.h), translateX: 0, translateY: 0,
      size: Math.floor(Math.random() * 2) + opts.size, alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1, dy: (Math.random() - 0.5) * 0.1, magnetism: 0.1 + Math.random() * 4
    });
    const draw = (c, update) => {
      ctx.translate(c.translateX, c.translateY);
      ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${c.alpha})`; ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!update) circles.push(c);
    };
    const clear = () => ctx.clearRect(0, 0, dims.w, dims.h);
    const resize = () => {
      quantity = mobileQty !== null && window.innerWidth < 1024 ? mobileQty : opts.quantity;
      dims.w = host.offsetWidth; dims.h = host.offsetHeight;
      canvas.width = dims.w * dpr; canvas.height = dims.h * dpr;
      canvas.style.width = dims.w + "px"; canvas.style.height = dims.h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      circles = [];
      for (let i = 0; i < quantity; i++) draw(params());
    };
    const remap = (v, s1, e1, s2, e2) => { const r = ((v - s1) * (e2 - s2)) / (e1 - s1) + s2; return r > 0 ? r : 0; };
    const animate = () => {
      raf = 0;
      if (!onScreen || document.hidden) return;
      clear();
      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i];
        const edge = Math.min(c.x + c.translateX - c.size, dims.w - c.x - c.translateX - c.size, c.y + c.translateY - c.size, dims.h - c.y - c.translateY - c.size);
        const remapped = parseFloat(remap(edge, 0, 20, 0, 1).toFixed(2));
        if (remapped > 1) { c.alpha += 0.02; if (c.alpha > c.targetAlpha) c.alpha = c.targetAlpha; }
        else c.alpha = c.targetAlpha * remapped;
        c.x += c.dx + opts.vx; c.y += c.dy + opts.vy;
        c.translateX += (mouse.x / (opts.staticity / c.magnetism) - c.translateX) / opts.ease;
        c.translateY += (mouse.y / (opts.staticity / c.magnetism) - c.translateY) / opts.ease;
        draw(c, true);
        if (c.x < -c.size || c.x > dims.w + c.size || c.y < -c.size || c.y > dims.h + c.size) { circles.splice(i, 1); draw(params()); }
      }
      raf = requestAnimationFrame(animate);
    };
    const start = () => { if (!raf && !reduceMotion.matches) raf = requestAnimationFrame(animate); };
    window.addEventListener("pointermove", e => {
      if (!onScreen) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left - dims.w / 2, y = e.clientY - r.top - dims.h / 2;
      if (x < dims.w / 2 && x > -dims.w / 2 && y < dims.h / 2 && y > -dims.h / 2) { mouse.x = x; mouse.y = y; }
    }, { passive: true });
    let t = null;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(resize, 200); });
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); }, { rootMargin: "100px" }).observe(host);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
    resize();
    if (reduceMotion.matches) { clear(); circles.forEach(c => { c.alpha = c.targetAlpha; draw(c, true); }); } else start();
  }

  /* 3. Scroll reveal ---------------------------------------------------------
     .ion-reveal fades up 20px once when it enters the viewport.
     Per-element delay: style="--delay:.1s". */
  function initReveal(root) {
    const els = root.querySelectorAll(".ion-reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    }), { threshold: 0 });
    els.forEach(e => io.observe(e));
  }

  /* 4. Toggles --------------------------------------------------------------
     Any <button class="ion-toggle" role="switch" aria-checked="false">:
       click / Space / Enter flips it and fires a bubbling "change" event
       (event.detail.checked). Optional side labels inside the same
       .ion-toggle-row: <span data-toggle-set="off">Monthly</span> … "on" … */
  function initToggles(root) {
    root.querySelectorAll(".ion-toggle").forEach(btn => {
      if (btn.dataset.toggleReady) return;
      btn.dataset.toggleReady = "1";
      if (!btn.hasAttribute("role")) btn.setAttribute("role", "switch");
      if (!btn.hasAttribute("aria-checked")) btn.setAttribute("aria-checked", "false");
      if (!btn.type) btn.type = "button";
      const row = btn.closest(".ion-toggle-row");
      const labels = row ? [...row.querySelectorAll("[data-toggle-set]")] : [];
      const set = on => {
        if (btn.disabled || (btn.getAttribute("aria-checked") === "true") === on) return;
        btn.setAttribute("aria-checked", String(on));
        sync();
        btn.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { checked: on } }));
      };
      const sync = () => {
        const on = btn.getAttribute("aria-checked") === "true";
        labels.forEach(l => l.classList.toggle("is-current", (l.dataset.toggleSet === "on") === on));
      };
      btn.addEventListener("click", () => set(btn.getAttribute("aria-checked") !== "true"));
      labels.forEach(l => l.addEventListener("click", () => set(l.dataset.toggleSet === "on")));
      sync();
    });
  }

  /* 5. Pricing ---------------------------------------------------------------
     <div data-pricing> … <button class="ion-toggle" data-billing-toggle> …
     Prices: <span data-price data-monthly="29" data-annual="306"></span>
     Billing line: <span data-billing-note></span> */
  function initPricing(root) {
    root.querySelectorAll("[data-billing-toggle]").forEach(btn => {
      const scope = btn.closest("[data-pricing]") || document;
      const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 });
      btn.addEventListener("change", e => {
        const annual = e.detail.checked;
        scope.querySelectorAll("[data-price]").forEach(p => swap(p, fmt.format(+(annual ? p.dataset.annual : p.dataset.monthly)) + (annual ? "/yr" : "/mo")));
        scope.querySelectorAll("[data-billing-note]").forEach(n => swap(n, annual ? "Billed in one annual payment" : "Billed monthly"));
      });
    });
  }

  /* 6. Pagination -----------------------------------------------------------
     <nav data-pagination data-total="20" data-current="5"></nav>
     Options: data-variant="default|outline|ghost"  data-size="sm|lg"  data-compact
              data-href="?page={page}"  → renders <a> links instead of buttons (server paging)
     Fires a bubbling "pagechange" event (e.detail.page). Set el.dataset.current to jump. */
  const PAG_ICONS = {
    left: '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    dots: '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
  };
  /* Windowing: first + last always shown, `delta` neighbours, gaps as "…" */
  function visiblePages(current, total, delta) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    let start = Math.max(2, current - delta), end = Math.min(total - 1, current + delta);
    if (current === 1) end = Math.min(total - 1, 1 + delta * 2);
    else if (current === total) start = Math.max(2, total - delta * 2);
    else { start = Math.max(2, Math.min(start, current)); end = Math.min(total - 1, Math.max(end, current)); }
    if (start > 2) out.push("...");
    for (let i = start; i <= end; i++) if (i !== 1 && i !== total) out.push(i);
    if (end < total - 1) out.push("...");
    if (total > 1) out.push(total);
    return out;
  }
  function initPagination(root) {
    const mqSm = window.matchMedia("(max-width: 640px)"), mqMd = window.matchMedia("(max-width: 768px)");
    root.querySelectorAll("[data-pagination]").forEach(nav => {
      if (nav.dataset.paginationReady) return;
      nav.dataset.paginationReady = "1";
      nav.classList.add("ion-pagination");
      if (nav.hasAttribute("data-compact")) nav.classList.add("ion-pagination--compact");
      if (!nav.getAttribute("aria-label")) nav.setAttribute("aria-label", "Pagination");
      const variant = nav.dataset.variant || "default";
      let shown = "";
      const render = focusPage => {
        const total = Math.max(1, parseInt(nav.dataset.total || "1", 10));
        const current = Math.min(total, Math.max(1, parseInt(nav.dataset.current || "1", 10)));
        const size = mqSm.matches ? "sm" : (nav.dataset.size || "");
        const delta = mqSm.matches || mqMd.matches ? 1 : 2;
        const href = nav.dataset.href;
        nav.classList.remove("ion-pagination--sm", "ion-pagination--lg");
        if (size) nav.classList.add("ion-pagination--" + size);
        const layers = [...nav.querySelectorAll(":scope > .ion-motion")];
        nav.textContent = "";
        layers.forEach(l => nav.appendChild(l));
        const make = (cls, page, disabled) => {
          const isLink = href && !disabled;
          const b = document.createElement(isLink ? "a" : "button");
          b.className = cls;
          if (isLink) b.href = href.replace("{page}", page);
          else { b.type = "button"; if (disabled) b.disabled = true; }
          if (!disabled && !href) b.addEventListener("click", () => go(page));
          return b;
        };
        const prev = make("ion-pagination__nav", current - 1, current === 1);
        prev.innerHTML = PAG_ICONS.left; prev.append(document.createTextNode(mqSm.matches ? "Prev" : "Previous"));
        prev.setAttribute("aria-label", "Go to previous page");
        nav.appendChild(prev);
        visiblePages(current, total, delta).forEach(p => {
          if (p === "...") {
            const e = document.createElement("span"); e.className = "ion-pagination__ellipsis"; e.innerHTML = PAG_ICONS.dots;
            const sr = document.createElement("span"); sr.className = "ion-sr-only"; sr.textContent = "More pages"; e.appendChild(sr);
            nav.appendChild(e); return;
          }
          const item = make("ion-pagination__item ion-pagination__item--" + variant, p, false);
          item.textContent = p;
          item.setAttribute("aria-label", "Page " + p);
          item.dataset.page = p;
          if (p === current) { item.classList.add("is-active"); item.setAttribute("aria-current", "page"); }
          nav.appendChild(item);
        });
        const next = make("ion-pagination__nav", current + 1, current === total);
        next.append(document.createTextNode("Next")); next.insertAdjacentHTML("beforeend", PAG_ICONS.right);
        next.setAttribute("aria-label", "Go to next page");
        nav.appendChild(next);
        if (focusPage) { const f = nav.querySelector('[data-page="' + focusPage + '"]'); if (f) f.focus(); }
        shown = total + ":" + current;
      };
      const go = page => {
        const total = parseInt(nav.dataset.total || "1", 10);
        page = Math.min(total, Math.max(1, page));
        if (String(page) === nav.dataset.current) return;
        nav.dataset.current = page;
        render(page);
        nav.dispatchEvent(new CustomEvent("pagechange", { bubbles: true, detail: { page } }));
      };
      nav.goTo = go;
      /* external changes to data-total / data-current re-render */
      new MutationObserver(() => { if ((nav.dataset.total || "1") + ":" + (nav.dataset.current || "1") !== shown) render(); }).observe(nav, { attributes: true, attributeFilter: ["data-total", "data-current"] });
      mqSm.addEventListener("change", () => render()); mqMd.addEventListener("change", () => render());
      render();
      track(nav, ".ion-pagination__item.is-active", "ion-motion--page");
      hoverPill(nav, ".ion-pagination__item, .ion-pagination__nav:not(:disabled)", "ion-motion--hover");
    });
  }

  /* 7. Paginated table --------------------------------------------------------
     <table id="t" class="ion-table" data-page-size="5"> … </table>
     <nav data-pagination data-target="#t"></nav>  → pages the <tbody> rows client-side */
  function initPagedTables(root) {
    root.querySelectorAll("[data-pagination][data-target]").forEach(nav => {
      const table = document.querySelector(nav.dataset.target); if (!table || table.dataset.pagedReady) return;
      table.dataset.pagedReady = "1";
      const rows = [...table.tBodies[0].rows], size = parseInt(table.dataset.pageSize || "10", 10);
      nav.dataset.total = Math.max(1, Math.ceil(rows.length / size));
      const show = page => rows.forEach((r, i) => { r.hidden = i < (page - 1) * size || i >= page * size; });
      show(parseInt(nav.dataset.current || "1", 10));
      nav.addEventListener("pagechange", e => show(e.detail.page));
    });
  }

  /* 8. Animated sidebar (navbar) ---------------------------------------------
     <div class="ion-shell" data-sidebar-shell>
       <aside class="ion-sidebar" data-sidebar aria-label="…"> <div class="ion-sidebar__panel"> … </div> </aside>
       <div class="ion-shell__inset"> <header class="ion-shell__header"><button data-sidebar-trigger>…</button>
         <span data-sidebar-title></span></header> … </div>
     </div>
     • Desktop: expanded (16rem) ⇄ icon rail (4.25rem). ⌘/Ctrl+B, the trigger or the edge rail toggle it.
     • Mobile (<768px): slide-in sheet with overlay, focus trap, Esc, scroll lock, focus return.
     • Items: .ion-sidebar__item (link or button). An item with aria-controls toggles its
       .ion-sidebar__sub (one open at a time). aria-current="page" marks the active item / sub item.
     • Fires a bubbling "sidebarnavigate" event (e.detail = { label, item }) when an item is chosen.
     • data-scrollspy on the shell: items/sub items linking to "#id" become active while that
       section is in view (and their group opens) — the highlight glides as the page scrolls.
     • ⌘/Ctrl+B toggles the shell that contains focus, otherwise the first shell on the page.
     • API: shell.sidebar.toggle() / open() / close() / select(itemOrSubitem). */
  function initSidebars(root) {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const mq = window.matchMedia("(max-width: 767px)");
    root.querySelectorAll("[data-sidebar-shell]").forEach(shell => {
      if (shell.dataset.sidebarReady) return;
      shell.dataset.sidebarReady = "1";
      const aside = shell.querySelector("[data-sidebar]");
      if (!aside) return;
      let open = shell.dataset.state !== "collapsed", mobileOpen = false, lastTrigger = null, scrollLock = null;
      const items = [...aside.querySelectorAll(".ion-sidebar__item")];
      const subItems = [...aside.querySelectorAll(".ion-sidebar__subitem")];
      const labelOf = el => { const l = el.querySelector(".ion-sidebar__label"); return (l ? l.textContent : el.textContent).trim(); };

      // overlay (mobile) + edge rail (desktop)
      const overlay = document.createElement("button");
      overlay.type = "button"; overlay.className = "ion-sidebar__overlay"; overlay.tabIndex = -1; overlay.setAttribute("aria-label", "Close sidebar");
      shell.appendChild(overlay);
      const rail = document.createElement("button");
      rail.type = "button"; rail.className = "ion-sidebar__rail"; rail.tabIndex = -1; rail.title = "Toggle sidebar"; rail.setAttribute("aria-label", "Toggle sidebar");
      aside.appendChild(rail);

      // sliding active indicator (FLIP between items, across groups)
      const indicator = document.createElement("span"); indicator.className = "ion-sidebar__active"; indicator.setAttribute("aria-hidden", "true");
      const placeIndicator = target => {
        if (!target) { indicator.remove(); return; }
        if (indicator.parentElement === target) return;
        const from = indicator.isConnected ? indicator.getBoundingClientRect() : null;
        target.prepend(indicator);
        if (!from) return;
        const to = indicator.getBoundingClientRect();
        indicator.style.transition = "none";
        indicator.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
        indicator.getBoundingClientRect();
        indicator.style.transition = "";
        indicator.style.transform = "";
      };

      // hover pill per menu (fades + blurs in, then glides)
      const pills = [...aside.querySelectorAll(".ion-sidebar__menu")].map(menu => {
        const pill = document.createElement("span"); pill.className = "ion-sidebar__hover"; pill.setAttribute("aria-hidden", "true");
        menu.prepend(pill);
        const place = (li, jump) => {
          const first = jump || !pill.classList.contains("is-on");
          if (first) pill.style.transition = "opacity .2s, filter .2s";
          pill.style.transform = `translateY(${li.offsetTop}px)`;
          pill.classList.add("is-on");
          if (first) requestAnimationFrame(() => { pill.style.transition = ""; });
        };
        menu.querySelectorAll(":scope > li").forEach(li => li.addEventListener("mouseenter", () => place(li)));
        menu.addEventListener("mouseleave", () => pill.classList.remove("is-on"));
        return { menu, pill, place };
      });
      /* Layout changed (rail ⇄ expanded, a sub menu opened): snap each pill to the item
         still under the pointer, or hide it, so it never sits over the wrong rows. */
      const resyncPills = () => requestAnimationFrame(() => pills.forEach(({ menu, pill, place }) => {
        const li = menu.querySelector(":scope > li:hover");
        if (li) place(li, true); else pill.classList.remove("is-on");
      }));

      // sub menus
      const subs = items.filter(i => i.getAttribute("aria-controls")).map(btn => {
        const sub = document.getElementById(btn.getAttribute("aria-controls"));
        if (sub) sub.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--i", i));
        return { btn, sub };
      }).filter(s => s.sub);
      const setSub = (target) => {
        subs.forEach(({ btn, sub }) => {
          const on = btn === target;
          btn.setAttribute("aria-expanded", String(on));
          sub.dataset.state = on ? "open" : "closed";
          sub.inert = !on;
        });
        resyncPills();
      };

      const setActive = (el, quiet) => {
        if (el.getAttribute("aria-current") === "page") return;
        [...items, ...subItems].forEach(i => { i.removeAttribute("aria-current"); i.classList.remove("is-parent-active"); });
        el.setAttribute("aria-current", "page");
        let host = el;
        if (el.classList.contains("ion-sidebar__subitem")) {
          const sub = el.closest(".ion-sidebar__sub"), parent = sub && items.find(i => i.getAttribute("aria-controls") === sub.id);
          if (parent) { parent.classList.add("is-parent-active"); host = parent; }
        }
        placeIndicator(host);
        shell.querySelectorAll("[data-sidebar-title]").forEach(t => { t.textContent = labelOf(el); });
        if (!quiet) shell.dispatchEvent(new CustomEvent("sidebarnavigate", { bubbles: true, detail: { label: labelOf(el), item: el } }));
      };

      const lockScroll = on => {
        const b = document.body;
        if (on && !scrollLock) { scrollLock = { y: window.scrollY, o: b.style.overflow }; b.style.overflow = "hidden"; }
        else if (!on && scrollLock) { b.style.overflow = scrollLock.o; scrollLock = null; }
      };

      const sync = () => {
        const mobile = mq.matches, collapsed = !mobile && !open;
        shell.dataset.mobile = String(mobile);
        shell.dataset.state = mobile ? (mobileOpen ? "expanded" : "collapsed") : (open ? "expanded" : "collapsed");
        aside.dataset.state = collapsed ? "collapsed" : "expanded";
        aside.dataset.mobileOpen = String(mobile && mobileOpen);
        overlay.dataset.open = String(mobile && mobileOpen);
        shell.querySelectorAll("[data-sidebar-trigger]").forEach(t => t.setAttribute("aria-expanded", String(mobile ? mobileOpen : open)));
        items.forEach(it => {
          it.removeAttribute("title"); /* the rail shows a flyout card instead of the native tooltip */
          if (collapsed) it.setAttribute("aria-label", labelOf(it)); else it.removeAttribute("aria-label");
        });
        if (mobile) { aside.setAttribute("role", "dialog"); aside.setAttribute("aria-modal", "true"); aside.inert = !mobileOpen; }
        else { aside.removeAttribute("role"); aside.removeAttribute("aria-modal"); aside.inert = false; }
        lockScroll(mobile && mobileOpen);
        if (!collapsed) hideFly();
        resyncPills();
      };

      const setMobile = (on, trigger) => {
        if (on === mobileOpen) return;
        mobileOpen = on;
        if (on) lastTrigger = trigger || document.activeElement;
        sync();
        if (on) requestAnimationFrame(() => { const f = aside.querySelector(FOCUSABLE); (f || aside).focus({ preventScroll: true }); });
        else if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
      };
      const toggle = trigger => { if (mq.matches) setMobile(!mobileOpen, trigger); else { open = !open; if (!open) setSub(null); sync(); } };

      shell.querySelectorAll("[data-sidebar-trigger]").forEach(t => t.addEventListener("click", () => toggle(t)));
      aside.querySelectorAll("[data-sidebar-close]").forEach(c => c.addEventListener("click", () => mq.matches ? setMobile(false) : (open = false, sync())));
      rail.addEventListener("click", () => toggle());
      overlay.addEventListener("click", () => setMobile(false));

      items.forEach(it => it.addEventListener("click", e => {
        if (it.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
        const sub = subs.find(s => s.btn === it);
        if (sub) {
          if (!mq.matches && !open) { open = true; sync(); setSub(it); return; }
          setSub(it.getAttribute("aria-expanded") === "true" ? null : it);
          return;
        }
        if (it.getAttribute("href") === "#") e.preventDefault();
        setSub(null); spyHold(); setActive(it);
        if (mq.matches) setMobile(false);
      }));
      subItems.forEach(it => it.addEventListener("click", e => {
        if (it.getAttribute("href") === "#") e.preventDefault();
        spyHold(); setActive(it);
        if (mq.matches) setMobile(false);
      }));

      /* Collapsed rail flyout: hovering (or keyboard-focusing) an icon shows a card beside the rail.
         Section items list their sub items there; plain items show their label. The card glides
         between items, and a short grace period + hover bridge let the pointer travel into it. */
      const fly = document.createElement("div"); fly.className = "ion-sidebar__flyout"; fly.setAttribute("role", "group");
      document.body.appendChild(fly); /* fixed, outside the panel's overflow clip */
      let flyFor = null, flyTimer = 0, flyMute = false;
      const railMode = () => !mq.matches && !open;
      function hideFly() { clearTimeout(flyTimer); flyFor = null; fly.classList.remove("is-open"); }
      const hideSoon = () => { clearTimeout(flyTimer); flyTimer = setTimeout(hideFly, 160); };
      const showFly = it => {
        clearTimeout(flyTimer);
        if (!railMode() || flyFor === it) return;
        const wasOpen = fly.classList.contains("is-open"), s = subs.find(x => x.btn === it);
        fly.textContent = ""; fly.classList.toggle("is-label", !s); fly.setAttribute("aria-label", labelOf(it));
        const head = document.createElement("div"); head.className = "ion-sidebar__flyout-title"; head.textContent = labelOf(it);
        fly.appendChild(head);
        if (s) {
          const badge = it.querySelector(".ion-sidebar__badge");
          if (badge) { const b = document.createElement("b"); b.textContent = badge.textContent; head.appendChild(b); }
          const ul = document.createElement("ul");
          s.sub.querySelectorAll(".ion-sidebar__subitem").forEach((orig, i) => {
            const li = document.createElement("li"); li.style.setProperty("--i", i);
            const a = orig.cloneNode(true); a.removeAttribute("id");
            a.addEventListener("click", e => { if (a.getAttribute("href") === "#") e.preventDefault(); spyHold(); setActive(orig); hideFly(); });
            li.appendChild(a); ul.appendChild(li);
          });
          fly.appendChild(ul);
          hoverPill(ul, ".ion-sidebar__subitem");
        }
        // read (item, rail, card size) → write (position) in one pass
        const r = it.getBoundingClientRect(), x = aside.getBoundingClientRect().right + 8, h = fly.offsetHeight;
        const y = Math.max(8, Math.min(s ? r.top - 7 : r.top + (r.height - h) / 2, window.innerHeight - h - 8));
        if (!wasOpen) fly.classList.add("is-jump");
        fly.style.setProperty("--fx", x + "px"); fly.style.setProperty("--fy", y + "px");
        if (!wasOpen) { fly.getBoundingClientRect(); fly.classList.remove("is-jump"); }
        fly.classList.add("is-open"); flyFor = it;
      };
      items.forEach(it => {
        it.addEventListener("pointerenter", e => { if (e.pointerType !== "touch") showFly(it); });
        it.addEventListener("pointerleave", hideSoon);
        it.addEventListener("focus", () => { if (flyMute) flyMute = false; else if (it.matches(":focus-visible")) showFly(it); });
        it.addEventListener("blur", e => { if (!fly.contains(e.relatedTarget)) hideSoon(); });
        it.addEventListener("keydown", e => {
          if (!railMode() || flyFor !== it) return;
          if (e.key === "ArrowRight") { const f = fly.querySelector("a, button"); if (f) { e.preventDefault(); f.focus(); } }
          else if (e.key === "Escape") hideFly();
        });
      });
      fly.addEventListener("pointerenter", () => clearTimeout(flyTimer));
      fly.addEventListener("pointerleave", hideSoon);
      fly.addEventListener("focusout", e => { if (!fly.contains(e.relatedTarget) && e.relatedTarget !== flyFor) hideSoon(); });
      fly.addEventListener("keydown", e => {
        const links = [...fly.querySelectorAll("a, button")], i = links.indexOf(document.activeElement);
        if (e.key === "Escape" || e.key === "ArrowLeft") { e.preventDefault(); const f = flyFor; hideFly(); if (f) { flyMute = true; f.focus(); } }
        else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && links.length) { e.preventDefault(); links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length].focus(); }
      });
      aside.addEventListener("scroll", hideFly, true);
      window.addEventListener("scroll", () => { if (flyFor) hideFly(); }, { passive: true });

      // keyboard: Esc + focus trap for the mobile sheet; ⌘/Ctrl+B anywhere
      aside.addEventListener("keydown", e => {
        if (!mq.matches || !mobileOpen) return;
        if (e.key === "Escape") { e.preventDefault(); setMobile(false); return; }
        if (e.key !== "Tab") return;
        const f = [...aside.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null);
        if (!f.length) { e.preventDefault(); return; }
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
      window.addEventListener("keydown", e => {
        if (e.key.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey) || !shell.isConnected) return;
        const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        const a = document.activeElement, owner = (a && a.closest && a.closest("[data-sidebar-shell]")) || document.querySelector("[data-sidebar-shell]");
        if (owner !== shell) return;
        e.preventDefault(); toggle();
      });
      mq.addEventListener("change", () => { if (!mq.matches) mobileOpen = false; sync(); });

      // initial state
      setSub(null);
      const initial = aside.querySelector('.ion-sidebar__subitem[aria-current="page"], .ion-sidebar__item[aria-current="page"]');
      sync();
      if (initial) {
        const sub = initial.closest(".ion-sidebar__sub");
        if (sub) { const p = items.find(i => i.getAttribute("aria-controls") === sub.id); if (p) p.classList.add("is-parent-active"); placeIndicator(p); }
        else placeIndicator(initial);
        shell.querySelectorAll("[data-sidebar-title]").forEach(t => { t.textContent = labelOf(initial); });
      }
      /* Scrollspy: the active highlight follows the section in view */
      let holdUntil = 0;
      function spyHold() { holdUntil = performance.now() + 900; } /* a click wins over the spy while the page scrolls to it */
      if (shell.hasAttribute("data-scrollspy") && "IntersectionObserver" in window) {
        const links = [...items, ...subItems].filter(a => /^#.+/.test(a.getAttribute("href") || ""));
        const targets = new Map();
        links.forEach(a => { const t = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); if (t) targets.set(t, a); });
        const inView = new Set();
        let queued = false;
        const pick = () => {
          queued = false;
          if (performance.now() < holdUntil || !inView.size) return;
          /* last in document order wins: a nested section beats the container that holds it */
          const sorted = [...inView].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
          const link = targets.get(sorted[sorted.length - 1]);
          if (!link || link.getAttribute("aria-current") === "page") return;
          const sub = link.closest(".ion-sidebar__sub");
          if (sub && aside.dataset.state !== "collapsed") { const parent = subs.find(x => x.sub === sub); if (parent && parent.btn.getAttribute("aria-expanded") !== "true") setSub(parent.btn); }
          setActive(link, true);
        };
        const io = new IntersectionObserver(es => { es.forEach(e => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target))); if (!queued) { queued = true; queueMicrotask(pick); } }, { rootMargin: "-15% 0px -70% 0px" }); /* IO already runs after layout: pick right away */
        targets.forEach((_, t) => io.observe(t));
      }
      const kbd = shell.querySelectorAll("[data-sidebar-shortcut]");
      kbd.forEach(k => { k.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘B" : "Ctrl+B"; });
      shell.sidebar = { select: el => { spyHold(); setActive(el); }, toggle, open: () => (mq.matches ? setMobile(true) : (open = true, sync())), close: () => (mq.matches ? setMobile(false) : (open = false, setSub(null), sync())) };
    });
  }

  /* 9. Secret reveal ----------------------------------------------------------
     For one-time passwords, API keys, recovery codes. Click 1 peels the cover back; click 2 copies.
     <button data-secret data-value="482913" data-label="Reveal one-time code"
             data-hint="Your sign-in code" data-format="otp|key|plain" data-autohide="30"></button>
     • data-format="otp" groups digits (482 913); "key" keeps the head and tail visible (sk_live_4f…9a2c)
       while copying the full value.  • Esc re-covers; data-autohide re-covers after N seconds.
     • Events: "secretreveal" (before showing, so apps can call el.secret.set(value) lazily), "secretcopy".
     • API: el.secret.set(value) · el.secret.hide() · el.secret.reveal() */
  const COPY_ICON = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  const CHECK_ICON = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const LOCK_ICON = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => { /* fallback for http / older browsers */
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); } finally { ta.remove(); }
    });
  }
  function initSecrets(root) {
    root.querySelectorAll("[data-secret]").forEach(btn => {
      if (btn._secret) return;
      const o = btn.dataset;
      let value = o.value || "", state = "covered", hideTimer = 0, copyTimer = 0;
      const fmt = v => {
        if (o.format === "otp") return v.replace(/\s+/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
        if (o.format === "key" && v.length > 18) return v.slice(0, 10) + "…" + v.slice(-4);
        return v;
      };
      btn.type = "button";
      btn.classList.add("ion-secret");
      btn.innerHTML =
        '<span class="ion-secret__under"><span class="ion-secret__hint"></span>' +
        '<span class="ion-secret__value"><code class="ion-secret__code"></code>' + COPY_ICON + '</span>' +
        '<span class="ion-secret__done">' + CHECK_ICON + '<span>Copied to clipboard</span></span></span>' +
        '<span class="ion-secret__cover" aria-hidden="true">' + LOCK_ICON + '<span class="ion-secret__label"></span></span>' +
        '<span class="ion-secret__flap" aria-hidden="true"><svg viewBox="0 0 48 56" fill="none"><path d="M36 4 12 52l16 4Z" fill="url(#ion-secret-peel)"/></svg></span>' +
        '<span class="ion-sr-only" aria-live="polite"></span>';
      if (!document.getElementById("ion-secret-peel")) {
        document.body.insertAdjacentHTML("beforeend", '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="ion-secret-peel" x1="36" y1="4" x2="18" y2="54" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b82f6" stop-opacity=".4"/><stop offset=".25" stop-color="#3b82f6" stop-opacity=".7"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs></svg>');
      }
      const $ = s => btn.querySelector(s);
      const live = $(".ion-sr-only");
      $(".ion-secret__hint").textContent = o.hint || "Hover to peek, click to reveal";
      $(".ion-secret__label").textContent = o.label || "Reveal secret";
      const render = () => {
        $(".ion-secret__code").textContent = fmt(value);
        btn.dataset.state = state;
        btn.setAttribute("aria-label", state === "covered" ? (o.label || "Reveal secret") : "Copy " + (o.hint || "secret") + " to clipboard");
      };
      const hide = () => { clearTimeout(hideTimer); state = "covered"; render(); };
      const reveal = () => {
        btn.dispatchEvent(new CustomEvent("secretreveal", { bubbles: true }));
        state = "revealed"; render(); live.textContent = "Revealed. Press again to copy, Escape to hide.";
        const secs = parseInt(o.autohide || "0", 10);
        if (secs > 0) { clearTimeout(hideTimer); hideTimer = setTimeout(hide, secs * 1000); }
      };
      new ResizeObserver(([e]) => btn.style.setProperty("--w", e.contentRect.width + "px")).observe(btn);
      btn.addEventListener("click", () => {
        if (state === "covered") { reveal(); return; }
        copyText(value.replace(/\s+/g, o.format === "otp" ? "" : " ").trim()).then(() => {
          state = "copied"; render(); live.textContent = "Copied to clipboard.";
          btn.dispatchEvent(new CustomEvent("secretcopy", { bubbles: true }));
          clearTimeout(copyTimer); copyTimer = setTimeout(() => { if (state === "copied") { state = "revealed"; render(); } }, 2000);
        }).catch(() => { live.textContent = "Copy failed. Select the code manually."; });
      });
      btn.addEventListener("keydown", e => { if (e.key === "Escape" && state !== "covered") { e.preventDefault(); hide(); live.textContent = "Hidden."; } });
      btn._secret = btn.secret = { set: v => { value = String(v); render(); }, hide, reveal };
      render();
    });
  }

  /* 10. AI loader -------------------------------------------------------------
     <div class="ion-ai-loader" role="status"><span class="ion-ai-loader__text">Generating</span></div>
     Splits the label into letters for the staggered pulse; the sphere itself is CSS.
     To change the text later: set .ion-ai-loader__text's textContent, then Ion.init(loader). */
  function initAiLoaders(root) {
    root.querySelectorAll(".ion-ai-loader__text").forEach(t => {
      const text = t.textContent.trim();
      if (t.dataset.split === text) return;
      const host = t.closest(".ion-ai-loader");
      if (host) host.setAttribute("aria-label", text);
      t.setAttribute("aria-hidden", "true"); t.textContent = ""; t.dataset.split = text;
      [...text].forEach((ch, i) => { const s = document.createElement("span"); s.textContent = ch === " " ? " " : ch; s.style.setProperty("--i", i); t.appendChild(s); });
    });
  }

  /* 11. Flux loader -----------------------------------------------------------
     <div data-flux data-value="40" data-phases="0:uploading, 40:processing, 75:finalizing, 100:complete" data-label="Upload"></div>
     A glowing progress bar; when the value crosses a phase, the new label flies in letter by letter.
     • API: el.flux.set(0–100) · el.flux.value()   • Event: "fluxphase" {label, value}
     • data-demo loops simulated progress (previews only). */
  const FLUX_PHASES = "0:uploading, 40:processing, 75:finalizing, 100:complete";
  function initFlux(root) {
    root.querySelectorAll("[data-flux]").forEach(host => {
      if (host.flux) return;
      const phases = (host.dataset.phases || FLUX_PHASES).split(",").map(x => {
        const i = x.indexOf(":"); return { at: parseFloat(x.slice(0, i)), label: x.slice(i + 1).trim() };
      }).sort((a, b) => a.at - b.at);
      host.classList.add("ion-flux");
      host.innerHTML = '<div class="ion-flux__label" aria-hidden="true"></div><div class="ion-flux__track"><div class="ion-flux__clip"><div class="ion-flux__fill"></div></div><div class="ion-flux__spark"></div></div>';
      host.setAttribute("role", "progressbar"); host.setAttribute("aria-valuemin", "0"); host.setAttribute("aria-valuemax", "100");
      if (!host.hasAttribute("aria-label")) host.setAttribute("aria-label", host.dataset.label || "Progress");
      const label = host.querySelector(".ion-flux__label");
      let value = -1, phase = null, seq = 0;
      const phaseFor = v => phases.reduce((p, x) => (v >= x.at ? x : p), phases[0]);
      const write = text => {
        const my = ++seq;
        const put = () => {
          if (my !== seq) return;
          label.textContent = "";
          [...text].forEach((ch, i) => {
            const s = document.createElement("span"); s.textContent = ch; label.appendChild(s);
            if (!reduceMotion.matches && s.animate) s.animate([{ opacity: 0, transform: "translate(10px, 6px) scale(.85)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 520, delay: i * 38, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" });
          });
        };
        if (!label.firstChild || reduceMotion.matches || !label.animate) { put(); return; }
        const out = label.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(-6px)", filter: "blur(6px)" }], { duration: 180, easing: "ease-in", fill: "forwards" });
        const next = () => { put(); out.cancel(); };
        out.finished.then(next, next);
      };
      const set = v => {
        v = Math.max(0, Math.min(100, +v || 0));
        if (v === value) return;
        value = v;
        host.style.setProperty("--p", v + "%"); host.style.setProperty("--pf", v / 100);
        host.classList.toggle("is-empty", v <= 0); host.classList.toggle("is-done", v >= 100);
        host.setAttribute("aria-valuenow", String(Math.round(v)));
        const p = phaseFor(v);
        if (p !== phase) {
          phase = p; write(p.label); host.setAttribute("aria-valuetext", p.label);
          host.dispatchEvent(new CustomEvent("fluxphase", { bubbles: true, detail: { label: p.label, value: v } }));
        }
      };
      host.flux = { set, value: () => value };
      set(host.dataset.value || 0);
      if (host.hasAttribute("data-demo")) {
        let hold = 0;
        setInterval(() => {
          if (document.hidden || host.classList.contains("is-paused")) return;
          if (value >= 100) { if (++hold > 6) { hold = 0; set(0); } return; }
          set(value + 2);
        }, 200);
      }
    });
  }

  /* 12. File upload -----------------------------------------------------------
     [data-upload] › label.ion-upload__drop (with input[type=file]) + ul.ion-upload__list
       (+ [data-upload-count], + optional <script type="application/json">{"items":[…]}</script>)
     items: {id, name, size (bytes), type, progress (0–100), status: "uploading"|"success"|"error", error}
     • data-max-files, data-max-size (MB). Drop files on the zone or browse.
     • Events: "uploadadd" {items} (start uploads here; items[i].file is the File),
       "uploadremove" {item}, "uploadretry" {item}
     • API: el.upload.progress(id, pct) · .done(id) · .fail(id, message) · .remove(id) · .add(files) · .items()
     • data-demo simulates the transfer (previews only). */
  const icon = d => '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const FILE_PAGE = '<path d="M14 2v5a1 1 0 0 0 1 1h5"/>';
  const FILE_BODY = '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>';
  const FILE_ICONS = {
    file: icon(FILE_BODY + FILE_PAGE),
    archive: icon('<path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"/>' + FILE_PAGE + '<path d="M8 12v-1"/><path d="M8 18v-2"/><path d="M8 7V6"/><circle cx="8" cy="20" r="2"/>'),
    video: icon(FILE_BODY + FILE_PAGE + '<path d="M15.033 13.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56v-4.704a.645.645 0 0 1 .967-.56z"/>'),
    image: icon(FILE_BODY + FILE_PAGE + '<circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/>'),
    audio: icon('<path d="M4 6.835V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-.343"/>' + FILE_PAGE + '<path d="M2 19a2 2 0 0 1 4 0v1a2 2 0 0 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 0 1-4 0v-1a2 2 0 0 1 4 0"/>'),
    text: icon(FILE_BODY + FILE_PAGE + '<path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>')
  };
  const UI_ICONS = {
    ok: icon('<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>'),
    alert: icon('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
    retry: icon('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    x: icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>')
  };
  function fileKind(it) {
    const t = (it.type || "") + " " + it.name;
    if (/zip|rar|7z|tar|gzip|\.gz\b/i.test(t)) return "archive";
    if (/video|\.(mov|mp4|webm|mkv)\b/i.test(t)) return "video";
    if (/image|\.(png|jpe?g|gif|webp|svg|avif)\b/i.test(t)) return "image";
    if (/audio|\.(mp3|wav|m4a|ogg|flac)\b/i.test(t)) return "audio";
    if (/pdf|text|word|document|\.(txt|md|rtf|docx?)\b/i.test(t)) return "text";
    return "file";
  }
  function fileSize(b) {
    const u = ["B", "KB", "MB", "GB"]; let i = 0; b = +b || 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (i && b < 10 ? b.toFixed(1) : Math.round(b)) + " " + u[i];
  }
  let uploadSeq = 0;
  function initUploads(root) {
    root.querySelectorAll("[data-upload]").forEach(host => {
      if (host.upload) return;
      const o = host.dataset, demo = host.hasAttribute("data-demo");
      const drop = host.querySelector(".ion-upload__drop"), input = host.querySelector('input[type="file"]');
      let list = host.querySelector(".ion-upload__list");
      if (!list) { list = document.createElement("ul"); list.className = "ion-upload__list"; host.appendChild(list); }
      const count = host.querySelector("[data-upload-count]");
      const live = document.createElement("span"); live.className = "ion-sr-only"; live.setAttribute("aria-live", "polite"); host.appendChild(live);
      const cfg = host.querySelector('script[type="application/json"]');
      const items = [], timers = new Map();
      const find = id => items.find(i => i.id === id);
      const fire = (name, detail) => host.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
      const recount = () => {
        if (!count) return;
        const ready = items.filter(i => i.status === "success").length;
        swap(count, items.length ? `${ready} of ${items.length} ${items.length === 1 ? "file" : "files"} ready` : "No files yet");
      };
      const paint = it => {
        const li = it.el, $ = s => li.querySelector(s);
        li.dataset.status = it.status;
        $(".ion-upload__meta").innerHTML = "";
        $(".ion-upload__meta").textContent = `${(it.name.split(".").pop() || "").toUpperCase()} · ${fileSize(it.size)}`;
        if (it.status === "error") { const em = document.createElement("em"); em.textContent = " · " + (it.error || "Upload failed"); $(".ion-upload__meta").appendChild(em); }
        $(".ion-upload__pct").textContent = it.status === "uploading" ? Math.floor(it.progress) + "%" : "";
        $(".ion-upload__state").innerHTML = it.status === "success" ? UI_ICONS.ok : it.status === "error" ? UI_ICONS.alert : "";
        $(".ion-upload__state").setAttribute("aria-label", it.status === "success" ? "Uploaded" : it.status === "error" ? "Failed" : "Uploading");
        $("[data-retry]").hidden = it.status !== "error";
        $(".ion-upload__bar span").style.setProperty("--p", (it.status === "success" ? 100 : it.progress) + "%");
        recount();
      };
      const build = it => {
        const li = document.createElement("li");
        li.className = "ion-upload__item";
        li.innerHTML = `<span class="ion-upload__icon">${FILE_ICONS[fileKind(it)]}</span><div class="ion-upload__body"><div class="ion-upload__row"><span class="ion-upload__name"></span><span class="ion-upload__actions"><span class="ion-upload__pct"></span><span class="ion-upload__state" role="img"></span><button class="ion-upload__act" type="button" data-retry hidden>${UI_ICONS.retry}</button><button class="ion-upload__act" type="button" data-remove>${UI_ICONS.x}</button></span></div><span class="ion-upload__meta"></span><div class="ion-upload__bar" aria-hidden="true"><span></span></div></div>`;
        li.querySelector(".ion-upload__name").textContent = it.name;
        li.querySelector(".ion-upload__name").title = it.name;
        li.querySelector("[data-retry]").setAttribute("aria-label", "Retry " + it.name);
        li.querySelector("[data-remove]").setAttribute("aria-label", "Remove " + it.name);
        it.el = li; list.appendChild(li); paint(it);
        return li;
      };
      const stopSim = id => { clearInterval(timers.get(id)); timers.delete(id); };
      const simulate = it => {
        stopSim(it.id);
        timers.set(it.id, setInterval(() => {
          if (it.status !== "uploading") return stopSim(it.id);
          api.progress(it.id, Math.min(100, it.progress + 7 + Math.random() * 12));
        }, 520));
      };
      const api = {
        items: () => items.map(({ el, ...rest }) => rest),
        progress(id, pct) {
          const it = find(id); if (!it) return;
          it.progress = Math.max(0, Math.min(100, +pct || 0)); it.status = "uploading";
          if (it.progress >= 100) { api.done(id); return; }
          paint(it);
        },
        done(id) { const it = find(id); if (!it) return; stopSim(id); it.progress = 100; it.status = "success"; paint(it); live.textContent = it.name + " uploaded."; },
        fail(id, message) { const it = find(id); if (!it) return; stopSim(id); it.status = "error"; it.error = message || "Upload failed"; paint(it); live.textContent = it.name + " failed: " + it.error; },
        remove(id) {
          const i = items.findIndex(x => x.id === id); if (i < 0) return;
          const [it] = items.splice(i, 1); stopSim(id); recount();
          fire("uploadremove", { item: { ...it, el: undefined } });
          const li = it.el;
          if (reduceMotion.matches || !li.animate) { li.remove(); return; }
          li.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateX(12px)", filter: "blur(4px)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.then(() => li.remove(), () => li.remove());
        },
        add(files) {
          const room = Math.max(0, (+o.maxFiles || Infinity) - items.length);
          const added = [...files].slice(0, room).map(f => {
            const it = { id: "f" + (++uploadSeq), name: f.name, size: f.size, type: f.type, progress: 0, status: "uploading", file: f };
            if (o.maxSize && f.size > +o.maxSize * 1048576) { it.status = "error"; it.error = `Over ${o.maxSize} MB`; }
            items.push(it); enter(build(it));
            return it;
          });
          if (files.length > room) live.textContent = `Only ${o.maxFiles} files allowed.`;
          if (!added.length) return [];
          fire("uploadadd", { items: added.map(({ el, ...rest }) => rest) });
          if (demo) added.filter(i => i.status === "uploading").forEach(simulate);
          return added;
        }
      };
      host.upload = api;
      if (cfg) {
        try {
          (JSON.parse(cfg.textContent).items || []).forEach(x => {
            const it = { id: x.id || "f" + (++uploadSeq), name: x.name, size: x.size, type: x.type, progress: x.progress || 0, status: x.status || "uploading", error: x.error };
            items.push(it); build(it);
            if (demo && it.status === "uploading") simulate(it);
          });
        } catch (e) { /* bad JSON: start empty */ }
      }
      recount();
      if (input) input.addEventListener("change", () => { if (input.files.length) api.add(input.files); input.value = ""; });
      if (drop) {
        let depth = 0;
        drop.addEventListener("dragenter", e => { e.preventDefault(); depth++; drop.classList.add("is-drag"); });
        drop.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
        drop.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; drop.classList.remove("is-drag"); } });
        drop.addEventListener("drop", e => { e.preventDefault(); depth = 0; drop.classList.remove("is-drag"); if (e.dataTransfer.files.length) api.add(e.dataTransfer.files); });
      }
      list.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const li = b.closest(".ion-upload__item"), it = items.find(x => x.el === li); if (!it) return;
        if (b.hasAttribute("data-remove")) api.remove(it.id);
        if (b.hasAttribute("data-retry")) {
          it.status = "uploading"; it.error = ""; paint(it); live.textContent = "Retrying " + it.name;
          fire("uploadretry", { item: { ...it, el: undefined } });
          if (demo) simulate(it);
        }
      });
    });
  }

  /* 13. Profile menu ----------------------------------------------------------
     [data-profile] › button.ion-profile__trigger[aria-controls] + .ion-profile__menu[role=menu] › .ion-profile__item
     Built to sit docked bottom-right (.ion-profile--dock), so the menu opens UPWARD; .ion-profile--down opens it below.
     Keys: Enter / Space / ↑ / ↓ open · ↑ ↓ Home End move · Esc closes. Click outside closes.
     • Event: "profileselect" {label, item}   • API: el.profile.open() · .close() · .toggle() */
  function initProfiles(root) {
    root.querySelectorAll("[data-profile]").forEach(host => {
      if (host.profile) return;
      const trig = host.querySelector(".ion-profile__trigger"), menu = host.querySelector(".ion-profile__menu");
      if (!trig || !menu) return;
      const items = () => [...menu.querySelectorAll(".ion-profile__item")];
      items().forEach(i => i.setAttribute("tabindex", "-1"));
      const pill = hoverPill(menu, ".ion-profile__item:not(.ion-profile__item--danger)");
      menu.addEventListener("pointerover", e => { if (e.target.closest(".ion-profile__item--danger")) pill.hide(); });
      let hideT = 0;
      const isOpen = () => trig.getAttribute("aria-expanded") === "true";
      const focusAt = i => { const all = items(); const t = all[(i + all.length) % all.length]; if (t) { t.focus(); t.classList.contains("ion-profile__item--danger") ? pill.hide() : pill.to(t); } };
      const open = (at = 0) => {
        clearTimeout(hideT);
        menu.hidden = false; void menu.offsetWidth; menu.classList.add("is-open");
        trig.setAttribute("aria-expanded", "true");
        if (at !== null) requestAnimationFrame(() => focusAt(at));
      };
      const close = (refocus) => {
        if (!isOpen()) return;
        menu.classList.remove("is-open"); trig.setAttribute("aria-expanded", "false"); pill.hide();
        hideT = setTimeout(() => { if (!isOpen()) menu.hidden = true; }, reduceMotion.matches ? 0 : 260);
        if (refocus) trig.focus();
      };
      const toggle = () => (isOpen() ? close() : open(null));
      trig.addEventListener("click", toggle);
      trig.addEventListener("keydown", e => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const up = !host.classList.contains("ion-profile--down"); open((e.key === "ArrowUp") === up ? -1 : 0); }
      });
      menu.addEventListener("keydown", e => {
        const all = items(), i = all.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); focusAt(i + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(i < 0 ? -1 : i - 1); }
        else if (e.key === "Home") { e.preventDefault(); focusAt(0); }
        else if (e.key === "End") { e.preventDefault(); focusAt(-1); }
        else if (e.key === "Escape") { e.preventDefault(); close(true); }
        else if (e.key === "Tab") close();
      });
      menu.addEventListener("click", e => {
        const it = e.target.closest(".ion-profile__item"); if (!it) return;
        const label = (it.querySelector("span") || it).textContent.trim();
        host.dispatchEvent(new CustomEvent("profileselect", { bubbles: true, detail: { label, item: it } }));
        close(true);
      });
      document.addEventListener("pointerdown", e => { if (isOpen() && !host.contains(e.target)) close(); });
      host.profile = { open: () => open(0), close: () => close(), toggle };
    });
  }

  function init(root = document) {
    initGlow(root);
    root.querySelectorAll("[data-particles]").forEach(initParticles);
    initReveal(root);
    initToggles(root);
    initPricing(root);
    initPagedTables(root);
    initPagination(root);
    initSidebars(root);
    initSecrets(root);
    initAiLoaders(root);
    initFlux(root);
    initUploads(root);
    initProfiles(root);
    segmentedMotion(root);
    pauseOffscreen(root);
  }
  window.Ion = Object.assign(window.Ion || {}, {
    init,
    motion: { glide, track, hoverPill, swap, enter, segmented: segmentedMotion, reduced: () => reduceMotion.matches }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init()); else init();
})();
