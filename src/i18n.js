import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { setLocale } from 'yup'

const initI18n = () => {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .init({
      fallbackLng: 'ru',
      lng: 'ru', // Явно устанавливаем русский язык
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      backend: {
        loadPath: '/locales/{{lng}}/translation.json',
      },
    })

  setLocale({
    mixed: {
      required: () => i18n.t('errors.required'),
      notOneOf: () => i18n.t('errors.notOneOf'),
    },
    string: {
      url: () => i18n.t('errors.url'),
    },
  })

  return i18n
}

const i18nInstance = initI18n()

export { i18nInstance as i18n }
