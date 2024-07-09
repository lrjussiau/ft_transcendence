
let i18nextInitialized = false;

function initI18next() {
    return window.i18next
        .use(window.i18nextHttpBackend)
        .use(window.i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'en',
            backend: {
                loadPath: '/static/locales/{{lng}}/{{ns}}.json'
            },
            detection: {
                order: ['localStorage', 'navigator'],
                lookupLocalStorage: 'i18nextLng',
            }
        }).then(() => {
            i18nextInitialized = true;
            updateContent();
            document.documentElement.lang = window.i18next.language;
        });
}

function updateContent(rootElement = document) {
  if (!i18nextInitialized) {
      console.warn('i18next not initialized yet. Content update skipped.');
      return;
  }
  rootElement.querySelectorAll('[data-i18n]').forEach(elem => {
      const key = elem.getAttribute('data-i18n');
      if (key.includes('[')) {
          // It's an attribute translation
          const parts = key.split(';');
          parts.forEach(part => {
              const matches = part.match(/\[(.+)\](.+)/);
              if (matches) {
                  const attr = matches[1];
                  const attrKey = matches[2];
                  elem.setAttribute(attr, window.i18next.t(attrKey));
              }
          });
      } else {
          // It's a text content translation
          elem.textContent = window.i18next.t(key);
      }
  });
}

// Expose functions to global scope
window.initI18next = initI18next;
window.updateContent = updateContent;

// Initialize i18next
initI18next();