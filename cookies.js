/* Inference Agents — Cookie Consent Banner
   GDPR-compliant. Drop <script src="cookies.js"></script> before </body>.
   Stores preferences in localStorage under key: ia_consent */

(function () {
  'use strict';

  const STORAGE_KEY = 'ia_consent';
  const EXPIRY_DAYS = 365;

  // ── Check existing consent ──────────────────────────────
  function getConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() > data.expires) { localStorage.removeItem(STORAGE_KEY); return null; }
      return data;
    } catch { return null; }
  }

  function saveConsent(prefs) {
    const data = {
      essential: true,
      analytics: !!prefs.analytics,
      marketing: !!prefs.marketing,
      timestamp: Date.now(),
      expires: Date.now() + EXPIRY_DAYS * 864e5,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Notify analytics.js (and any other listeners) of the new consent state
    document.dispatchEvent(new CustomEvent('ia:consent', { detail: data }));
    return data;
  }

  // ── Inject CSS ──────────────────────────────────────────
  const css = `
    /* Banner */
    #ia-cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 9980;
      padding: 20px 24px;
      background: rgba(8, 8, 28, 0.97);
      border-top: 1px solid rgba(99,102,241,0.28);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
      font-family: 'Outfit', -apple-system, sans-serif;
      animation: ia-ck-slidein 0.4s ease;
    }
    @keyframes ia-ck-slidein {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .ia-ck-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .ia-ck-text {
      flex: 1;
      min-width: 260px;
    }
    .ia-ck-text p {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }
    .ia-ck-text strong { color: #f1f5f9; }
    .ia-ck-text a {
      color: #818cf8;
      text-decoration: underline;
      cursor: pointer;
    }
    .ia-ck-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      flex-shrink: 0;
    }
    .ia-ck-btn {
      padding: 9px 20px;
      border-radius: 9px;
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      white-space: nowrap;
    }
    .ia-ck-accept {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
    }
    .ia-ck-accept:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.45); }
    .ia-ck-reject {
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .ia-ck-reject:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }
    .ia-ck-manage {
      background: transparent;
      color: #818cf8;
      border: 1px solid rgba(99,102,241,0.35);
    }
    .ia-ck-manage:hover { background: rgba(99,102,241,0.1); color: #a5b4fc; }

    /* Modal overlay */
    #ia-cookie-modal {
      position: fixed;
      inset: 0;
      z-index: 9985;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Outfit', -apple-system, sans-serif;
      animation: ia-ck-fadein 0.25s ease;
    }
    @keyframes ia-ck-fadein {
      from { opacity: 0; } to { opacity: 1; }
    }

    /* Modal box */
    .ia-ck-modal-box {
      background: #0d0d24;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 18px;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.1);
      animation: ia-ck-popup 0.3s ease;
      overflow: hidden;
    }
    @keyframes ia-ck-popup {
      from { transform: scale(0.95) translateY(10px); opacity: 0; }
      to   { transform: scale(1) translateY(0);       opacity: 1; }
    }
    .ia-ck-modal-head {
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ia-ck-modal-head h3 {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }
    .ia-ck-modal-x {
      width: 28px; height: 28px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .ia-ck-modal-x:hover { background: rgba(255,255,255,0.11); color: #f1f5f9; }

    .ia-ck-modal-body { padding: 8px 0; }

    /* Cookie row */
    .ia-ck-row {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .ia-ck-row:last-child { border-bottom: none; }
    .ia-ck-row-info {}
    .ia-ck-row-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 3px;
    }
    .ia-ck-row-desc {
      font-size: 12.5px;
      color: #64748b;
      line-height: 1.5;
    }
    .ia-ck-row-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 100px;
      background: rgba(16,185,129,0.12);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.2);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 6px;
      vertical-align: middle;
    }

    /* Toggle switch */
    .ia-ck-toggle {
      flex-shrink: 0;
      width: 44px; height: 24px;
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
      border: none;
      outline: none;
      margin-top: 2px;
    }
    .ia-ck-toggle::after {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
      background: #fff;
      border-radius: 50%;
      top: 3px; left: 3px;
      transition: transform 0.3s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .ia-ck-toggle.on { background: #6366f1; box-shadow: 0 0 12px rgba(99,102,241,0.4); }
    .ia-ck-toggle.on::after { transform: translateX(20px); }
    .ia-ck-toggle.disabled { opacity: 0.45; cursor: not-allowed; background: #10b981; }
    .ia-ck-toggle.disabled::after { transform: translateX(20px); }

    .ia-ck-modal-foot {
      padding: 16px 24px 20px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    /* Utility */
    .ia-ck-hidden { display: none !important; }

    /* Cookie preferences link in footer */
    #ia-cookie-pref-link {
      cursor: pointer;
      color: #475569;
      font-size: 13px;
      text-decoration: none;
      transition: color 0.2s;
    }
    #ia-cookie-pref-link:hover { color: #818cf8; }

    @media (max-width: 600px) {
      .ia-ck-inner { flex-direction: column; gap: 16px; }
      .ia-ck-actions { width: 100%; }
      .ia-ck-btn { flex: 1; text-align: center; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Banner HTML ─────────────────────────────────────────
  function buildBanner() {
    const div = document.createElement('div');
    div.id = 'ia-cookie-banner';
    div.innerHTML = `
      <div class="ia-ck-inner">
        <div class="ia-ck-text">
          <p><strong>🍪 We use cookies</strong> to improve your experience on this site.
          Essential cookies are always active. You can choose which optional cookies to allow.
          See our <a id="ia-privacy-link">Privacy &amp; Cookie Policy</a> for details.</p>
        </div>
        <div class="ia-ck-actions">
          <button class="ia-ck-btn ia-ck-manage" id="ia-ck-manage">Manage Preferences</button>
          <button class="ia-ck-btn ia-ck-reject" id="ia-ck-reject">Reject Non-Essential</button>
          <button class="ia-ck-btn ia-ck-accept" id="ia-ck-accept">Accept All</button>
        </div>
      </div>
    `;
    return div;
  }

  // ── Modal HTML ──────────────────────────────────────────
  function buildModal(current) {
    const div = document.createElement('div');
    div.id = 'ia-cookie-modal';
    div.innerHTML = `
      <div class="ia-ck-modal-box">
        <div class="ia-ck-modal-head">
          <h3>Cookie Preferences</h3>
          <button class="ia-ck-modal-x" id="ia-ck-modal-close">✕</button>
        </div>
        <div class="ia-ck-modal-body">
          <div class="ia-ck-row">
            <div class="ia-ck-row-info">
              <div class="ia-ck-row-title">Essential Cookies <span class="ia-ck-row-badge">Always On</span></div>
              <div class="ia-ck-row-desc">Required for the site to function — login sessions, security, your cookie preferences. Cannot be disabled.</div>
            </div>
            <button class="ia-ck-toggle disabled" disabled aria-label="Essential cookies always on"></button>
          </div>
          <div class="ia-ck-row">
            <div class="ia-ck-row-info">
              <div class="ia-ck-row-title">Analytics Cookies</div>
              <div class="ia-ck-row-desc">Help us understand how visitors use the site so we can improve it. No personal data is shared with third parties.</div>
            </div>
            <button class="ia-ck-toggle ${current && current.analytics ? 'on' : ''}" id="ia-toggle-analytics" aria-label="Toggle analytics cookies"></button>
          </div>
          <div class="ia-ck-row">
            <div class="ia-ck-row-info">
              <div class="ia-ck-row-title">Marketing Cookies</div>
              <div class="ia-ck-row-desc">Used to show you relevant content and measure the effectiveness of our campaigns. You can opt out at any time.</div>
            </div>
            <button class="ia-ck-toggle ${current && current.marketing ? 'on' : ''}" id="ia-toggle-marketing" aria-label="Toggle marketing cookies"></button>
          </div>
        </div>
        <div class="ia-ck-modal-foot">
          <button class="ia-ck-btn ia-ck-reject" id="ia-ck-reject-all">Reject Non-Essential</button>
          <button class="ia-ck-btn ia-ck-accept" id="ia-ck-save">Save Preferences</button>
        </div>
      </div>
    `;
    return div;
  }

  // ── Preference link in footer ───────────────────────────
  function injectFooterLink() {
    const footerBottom = document.querySelector('.footer-bottom');
    if (!footerBottom) return;
    const sep = document.createTextNode(' · ');
    const link = document.createElement('a');
    link.id = 'ia-cookie-pref-link';
    link.textContent = 'Cookie Preferences';
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    footerBottom.appendChild(sep);
    footerBottom.appendChild(link);
    link.addEventListener('click', openModal);
    link.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(); });
  }

  // ── Logic ───────────────────────────────────────────────
  let banner = null;
  let modal = null;

  function dismissBanner() {
    if (banner) { banner.remove(); banner = null; }
  }

  function openModal() {
    if (modal) return;
    const current = getConsent();
    modal = buildModal(current);
    document.body.appendChild(modal);

    const analyticsToggle  = document.getElementById('ia-toggle-analytics');
    const marketingToggle  = document.getElementById('ia-toggle-marketing');
    const closeBtn         = document.getElementById('ia-ck-modal-close');
    const saveBtn          = document.getElementById('ia-ck-save');
    const rejectAllBtn     = document.getElementById('ia-ck-reject-all');

    analyticsToggle.addEventListener('click', () => analyticsToggle.classList.toggle('on'));
    marketingToggle.addEventListener('click', () => marketingToggle.classList.toggle('on'));

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    saveBtn.addEventListener('click', () => {
      saveConsent({
        analytics: analyticsToggle.classList.contains('on'),
        marketing: marketingToggle.classList.contains('on'),
      });
      closeModal();
      dismissBanner();
    });

    rejectAllBtn.addEventListener('click', () => {
      saveConsent({ analytics: false, marketing: false });
      closeModal();
      dismissBanner();
    });
  }

  function closeModal() {
    if (modal) { modal.remove(); modal = null; }
  }

  // ── Init ────────────────────────────────────────────────
  function init() {
    injectFooterLink();

    // Already consented — don't show banner
    if (getConsent()) return;

    banner = buildBanner();
    document.body.appendChild(banner);

    document.getElementById('ia-ck-accept').addEventListener('click', () => {
      saveConsent({ analytics: true, marketing: true });
      dismissBanner();
    });

    document.getElementById('ia-ck-reject').addEventListener('click', () => {
      saveConsent({ analytics: false, marketing: false });
      dismissBanner();
    });

    document.getElementById('ia-ck-manage').addEventListener('click', openModal);

    document.getElementById('ia-privacy-link').addEventListener('click', () => {
      window.location.href = '/privacy.html';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
