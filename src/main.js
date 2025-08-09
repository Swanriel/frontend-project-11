import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import * as yup from 'yup';
import onChange from 'on-change';
import View from './view.js';
import { rssSchema } from './validation.js';

// Инициализация состояния
const state = onChange({
  feeds: [],
  form: {
    state: 'filling', // filling, sending, success, error
    error: null,
    fields: {
      url: '',
    },
    valid: true,
  },
});

// Инициализация View
const formElement = document.getElementById('rss-form');
const inputElement = document.getElementById('url-input');
const feedbackElement = document.querySelector('.invalid-feedback');
const view = new View(formElement, inputElement, feedbackElement);

// Обработчики событий
formElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const url = formData.get('url').trim();

  state.form.state = 'sending';
  view.render(state.form);

  try {
    await rssSchema(state.feeds).validate({ url });
    state.feeds.push(url);
    state.form.state = 'success';
    state.form.error = null;
    state.form.valid = true;
    state.form.fields.url = '';
    view.render(state.form);
    view.resetForm();
  } catch (err) {
    state.form.state = 'error';
    state.form.error = err.message;
    state.form.valid = false;
    view.render(state.form);
  }
});

inputElement.addEventListener('input', (e) => {
  state.form.fields.url = e.target.value;
  state.form.valid = true;
  state.form.error = null;
  view.render(state.form);
});

// Связываем состояние с View
onChange(state, (path) => {
  if (path.startsWith('form')) {
    view.render(state.form);
  }
});
