import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import * as yup from 'yup'
import onChange from 'on-change'
import './style.css'
import './main.css'

const rssSchema = yup.object().shape({
  url: yup
    .string()
    .required('URL is required')
    .url('Incorrect URL')
    .test(
      'is-unique',
      'RSS already existed',
      (value, { parent: { feeds } }) => !feeds.includes(value)
    ),
});

const state = {
  form: {
    process: 'filling', // 'filling' | 'sending' | 'success' | 'error'
    error: null,
  },
  feeds: [],
};

const initView = (state, formEl, inputEl) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      inputEl.classList.toggle('is-invalid', !!state.form.error);
      const feedbackEl = inputEl.nextElementSibling;
      if (feedbackEl && feedbackEl.classList.contains('invalid-feedback')) {
        feedbackEl.textContent = state.form.error || '';
      }
    }
    if (path === 'form.process' && state.form.process === 'success') {
      formEl.reset();
      inputEl.focus();
    }
  });

  return watchedState;
};

const app = () => {
  const formEl = document.getElementById('rss-form');
  const inputEl = document.getElementById('rss-url');
  const watchedState = initView(state, formEl, inputEl);

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim();

    rssSchema
      .validate({ url, feeds: watchedState.feeds }, { abortEarly: false })
      .then(() => {
        watchedState.form.process = 'sending';
        watchedState.form.error = null;
        return new Promise((resolve) => {
          setTimeout(() => resolve(), 1000);
        });
      })
      .then(() => {
        watchedState.feeds.push(url);
        watchedState.form.process = 'success';
      })
      .catch((err) => {
        watchedState.form.error = err.message;
        watchedState.form.process = 'error';
      });
  });
};

app();
