/* Inference Agents — GA4 Consent Mode v2
   The gtag snippet in <head> loads with analytics_storage: 'denied' by default.
   This file upgrades consent to 'granted' when the visitor accepts analytics cookies,
   either on this page visit (ia:consent event) or on return visits (page load check).
*/

(function () {
  'use strict';

  function grantAnalytics() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted'
    });
  }

  function checkConsent() {
    try {
      var raw = localStorage.getItem('ia_consent');
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data.analytics === true && Date.now() <= data.expires) {
        grantAnalytics();
      }
    } catch (e) {}
  }

  // 1. Check on page load (returning visitors who already consented)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkConsent);
  } else {
    checkConsent();
  }

  // 2. Update consent when visitor accepts during this page visit
  document.addEventListener('ia:consent', function (e) {
    if (e.detail && e.detail.analytics) {
      grantAnalytics();
    }
  });

})();
