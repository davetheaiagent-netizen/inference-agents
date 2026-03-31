/* Inference Agents — Mobile nav hamburger
   Injects a hamburger button into every page's <nav> and handles open/close.
   Requires styles-dark.css for .nav-hamburger and .nav-links styles.
*/

(function () {
  'use strict';

  function initNav() {
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');
    if (!nav || !navLinks) return;

    // Build hamburger button
    const btn = document.createElement('button');
    btn.className = 'nav-hamburger';
    btn.setAttribute('aria-label', 'Toggle navigation');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    // Insert before the CTA button (last child of nav) so order is: logo · [hamburger] · btn
    const ctaBtn = nav.querySelector('a.btn');
    if (ctaBtn) {
      nav.insertBefore(btn, ctaBtn);
    } else {
      nav.appendChild(btn);
    }

    function openMenu() {
      navLinks.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      navLinks.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinks.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Close when a nav link is clicked (navigate away)
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });

    // Close when clicking outside the nav
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) closeMenu();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    // Close if window is resized above mobile breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

})();
