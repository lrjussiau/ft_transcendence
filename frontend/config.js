module.exports = {
    input: [
      'website/**/*.{js,html}',
    ],
    output: './website/static/locales',
    options: {
      debug: true,
      func: {
        list: ['i18next.t', 'i18n.t'],
        extensions: ['.js', '.jsx']
      },
      trans: {
        component: 'Trans',
        i18nKey: 'i18nKey',
        defaultsKey: 'defaults',
        extensions: ['.js', '.jsx'],
        fallbackKey: function(ns, value) {
          return value;
        },
      },
      lngs: ['en', 'fr', 'es', 'is'],
      ns: ['translation'],
      defaultLng: 'en',
      defaultNs: 'translation',
      defaultValue: '__STRING_NOT_TRANSLATED__',
      resource: {
        loadPath: 'website/static/locales/{{lng}}/{{ns}}.json',
        savePath: 'website/static/locales/{{lng}}/{{ns}}.json',
        jsonIndent: 2,
        lineEnding: '\n'
      },
      nsSeparator: false,
      keySeparator: false,
      interpolation: {
        prefix: '{{',
        suffix: '}}'
      }
    },
  };