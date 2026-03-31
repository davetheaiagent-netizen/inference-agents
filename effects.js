/**
 * effects.js — Inference Agents shared visual effects
 *
 * Provides on every page:
 *   1. Full-page neural network particle canvas (fixed, behind content)
 *   2. Custom cursor: glowing dot + trailing ring
 *
 * Drop-in: <script src="effects.js"></script>
 * No dependencies. Works alongside existing page styles.
 */

(function () {
  'use strict';

  // ── 1. Inject CSS ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #ia-bg-canvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      opacity: 0.55;
    }
    #ia-cursor-dot {
      position: fixed;
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #818cf8;
      box-shadow: 0 0 14px rgba(99,102,241,0.9), 0 0 32px rgba(99,102,241,0.5);
      pointer-events: none;
      z-index: 99999;
      top: 0; left: 0;
      will-change: transform;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #ia-cursor-ring {
      position: fixed;
      width: 40px; height: 40px;
      border-radius: 50%;
      border: 1.5px solid rgba(99,102,241,0.55);
      pointer-events: none;
      z-index: 99998;
      top: 0; left: 0;
      will-change: transform;
      opacity: 0;
      transition: width 0.18s ease, height 0.18s ease,
                  border-color 0.18s ease, background 0.18s ease,
                  opacity 0.3s;
    }
    #ia-cursor-ring.ia-cursor-hover {
      width: 60px; height: 60px;
      border-color: rgba(99,102,241,0.85);
      background: rgba(99,102,241,0.07);
    }
    @media (hover: none), (pointer: coarse) {
      #ia-cursor-dot, #ia-cursor-ring { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // ── 2. Inject HTML elements ────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'ia-bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const dot  = document.createElement('div');
  dot.id = 'ia-cursor-dot';
  const ring = document.createElement('div');
  ring.id = 'ia-cursor-ring';

  // Insert canvas as very first child of body so it's behind everything
  document.body.insertBefore(canvas, document.body.firstChild);
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  // ── 3. Neural canvas ───────────────────────────────────────────────────────
  (function initCanvas() {
    const ctx = canvas.getContext('2d');

    const N    = 65;   // node count
    const CONN = 170;  // max connection distance
    const SPD  = 0.28;
    const MR   = 200;  // mouse attraction radius
    const MF   = 0.012;

    const COLS = [
      [99,102,241],[139,92,246],[99,102,241],
      [129,140,248],[16,185,129],[167,139,250],[99,102,241]
    ];

    let W, H, nodes;
    let mx = null, my = null;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function mkNode() {
      const c = COLS[Math.floor(Math.random() * COLS.length)];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * SPD,
        vy: (Math.random() - 0.5) * SPD,
        r: 1.3 + Math.random() * 1.6,
        c,
        phase: Math.random() * Math.PI * 2,
        ps: 0.014 + Math.random() * 0.014,
      };
    }

    function init() {
      resize();
      nodes = Array.from({ length: N }, mkNode);
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);

      for (const n of nodes) {
        n.phase += n.ps;

        if (mx !== null) {
          const dx = mx - n.x, dy = my - n.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < MR) {
            const f = (1 - d / MR) * MF;
            n.vx += dx * f;
            n.vy += dy * f;
          }
        }

        n.vx *= 0.989; n.vy *= 0.989;
        const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (spd > SPD * 2.6) { n.vx *= SPD * 2.6 / spd; n.vy *= SPD * 2.6 / spd; }

        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > H) { n.y = H; n.vy *= -1; }
      }

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < CONN) {
            const alpha = (1 - d / CONN) * 0.2;
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, `rgba(${a.c},${alpha})`);
            g.addColorStop(1, `rgba(${b.c},${alpha})`);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = g;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes with glow
      for (const n of nodes) {
        const pr = n.r * (1 + Math.sin(n.phase) * 0.28);
        const g  = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 5);
        g.addColorStop(0, `rgba(${n.c},0.5)`);
        g.addColorStop(1, `rgba(${n.c},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, pr * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.c},0.85)`;
        ctx.fill();
      }

      requestAnimationFrame(frame);
    }

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseleave', () => { mx = null; my = null; });

    window.addEventListener('resize', () => {
      resize();
      for (const n of nodes) { n.x = Math.min(n.x, W); n.y = Math.min(n.y, H); }
    }, { passive: true });

    init();
    frame();
  })();

  // ── 4. Custom cursor ───────────────────────────────────────────────────────
  (function initCursor() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let mx = 0, my = 0, rx = 0, ry = 0, visible = false;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) {
        dot.style.opacity  = '1';
        ring.style.opacity = '1';
        visible = true;
      }
    });

    document.body.style.cursor = 'none';

    // Apply cursor:none to interactive elements (including any added after load)
    function hideCursors() {
      document.querySelectorAll('a, button, [role="button"], label, input, select, textarea')
        .forEach(el => { el.style.cursor = 'none'; });
    }
    hideCursors();
    // Re-run after a short delay to catch dynamically added elements
    setTimeout(hideCursors, 800);

    // Expand ring on hover
    function bindHover() {
      document.querySelectorAll(
        'a, button, .service-card, .sector-card, .agent-card, .pricing-card, ' +
        '.process-step, .blog-card, .case-card, .faq-item, .swap-card, .step-dot'
      ).forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('ia-cursor-hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('ia-cursor-hover'));
      });
    }
    bindHover();
    setTimeout(bindHover, 800);

    function tick() {
      dot.style.transform  = `translate(${mx - 5}px,${my - 5}px)`;
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.transform = `translate(${rx - 20}px,${ry - 20}px)`;
      requestAnimationFrame(tick);
    }
    tick();
  })();

})();
