// This runs the local banner engine and handles your trilingual translation
window.addEventListener('load', function() {
  // Bridges the banner's category choice into Google's own Consent Mode
  // signal. Without this, gtag.js keeps treating analytics_storage as
  // 'denied' (the default set in base.njk) even after the analytics
  // script tag itself gets re-enabled, so GA4 silently drops every hit.
  function updateGtagConsent() {
    if (typeof gtag !== 'function') return;
    var granted = CookieConsent.acceptedCategory('analytics');
    gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied'
    });
  }

  CookieConsent.run({
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: true
      }
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: { enabled: false }
    },
    onFirstConsent: updateGtagConsent,
    onConsent: updateGtagConsent,
    onChange: updateGtagConsent,
    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'We value your privacy',
            description: 'We use cookies to analyze our traffic and optimize your audit experience.',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all'
          }
        },
        fr: {
          consentModal: {
            title: 'Nous apprécions votre vie privée',
            description: 'Nous utilisons des cookies pour analyser notre trafic et optimiser votre expérience.',
            acceptAllBtn: 'Tout accepter',
            acceptNecessaryBtn: 'Tout refuser'
          }
        },
        // Covers ISO standard (used in your hreflang)
        el: {
          consentModal: {
            title: 'Σεβόμαστε την ιδιωτικότητά σας',
            description: 'Χρησιμοποιούμε cookies για την ανάλυση της επισκεψιμότητας και τη βελτιστοποίηση της εμπειρίας τεχνικού ελέγχου.',
            acceptAllBtn: 'Αποδοχή όλων',
            acceptNecessaryBtn: 'Απόρριψη όλων'
          }
        },
        // Covers your button dataset attribute (data-lang="gr")
        gr: {
          consentModal: {
            title: 'Σεβόμαστε την ιδιωτικότητά σας',
            description: 'Χρησιμοποιούμε cookies για την ανάλυση της επισκεψιμότητας και τη βελτιστοποίηση της εμπειρίας τεχνικού ελέγχου.',
            acceptAllBtn: 'Αποδοχή όλων',
            acceptNecessaryBtn: 'Απόρριψη όλων'
          }
        }
      }
    }
  });
});