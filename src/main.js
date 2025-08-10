import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import uniqueId from 'lodash/uniqueId';
import view from './view.js';
import { rssSchema } from './validation.js';

const app = () => {
  const state = {
    form: {
      process: 'filling',
      error: null,
      valid: true,
      url: '',
    },
    feeds: [],
    posts: [],
    ui: {
      viewedPostIds: new Set(),
    },
  };

  const elements = {
    formEl: document.getElementById('rss-form'),
    inputEl: document.getElementById('url-input'),
    feedbackEl: document.querySelector('.invalid-feedback'),
    feedsContainer: document.getElementById('feeds-container'),
    submitBtn: document.querySelector('#rss-form button[type="submit"]'),
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      elements.inputEl.classList.toggle('is-invalid', !!state.form.error);
      elements.feedbackEl.textContent = state.form.error || '';
    }

    if (path === 'form.process') {
      switch (state.form.process) {
        case 'sending':
          elements.submitBtn.disabled = true;
          elements.inputEl.readOnly = true;
          break;
        case 'success':
          elements.formEl.reset();
          elements.inputEl.focus();
          elements.submitBtn.disabled = false;
          elements.inputEl.readOnly = false;
          elements.inputEl.classList.remove('is-invalid');
          state.form.error = null;
          break;
        case 'error':
          elements.submitBtn.disabled = false;
          elements.inputEl.readOnly = false;
          break;
        default:
          break;
      }
    }
  });

  const renderFeeds = (feeds) => {
    elements.feedsContainer.innerHTML = feeds
      .map(
        (feed) => `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${feed.title}</h5>
            <p class="card-text">${feed.description}</p>
          </div>
        </div>
      `,
      )
      .join('');
  };

  const renderPosts = (posts) => {
    const postsHtml = posts
      .map(
        (post) => `
        <a href="${post.link}" 
           class="list-group-item list-group-item-action"
           target="_blank"
           data-id="${post.id}">
          ${post.title}
        </a>
      `,
      )
      .join('');

    elements.feedsContainer.innerHTML += `
      <div class="mt-4">
        <h2>Posts</h2>
        <div class="list-group">${postsHtml}</div>
      </div>
    `;
  };

  const parseRSS = (xmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error('Invalid RSS format');

    const feedTitle = doc.querySelector('channel > title').textContent;
    const feedDescription = doc.querySelector(
      'channel > description',
    ).textContent;

    const items = doc.querySelectorAll('item');
    const posts = Array.from(items).map((item) => ({
      id: uniqueId(),
      title: item.querySelector('title').textContent,
      link: item.querySelector('link').textContent,
    }));

    return {
      feed: { title: feedTitle, description: feedDescription },
      posts,
    };
  };

  elements.formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim();

    try {
      await rssSchema(state.feeds.map((f) => f.url)).validate({ url });
      watchedState.form.process = 'sending';
      watchedState.form.error = null;

      const proxyUrl = `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}&disableCache=true`;
      const response = await axios.get(proxyUrl);

      if (!response.data.contents) throw new Error('Network error');

      const { feed, posts } = parseRSS(response.data.contents);

      // Добавляем URL в фид для проверки дубликатов
      const feedWithUrl = { ...feed, url };

      watchedState.feeds.unshift(feedWithUrl);
      watchedState.posts.unshift(...posts);
      watchedState.form.process = 'success';

      renderFeeds(watchedState.feeds);
      renderPosts(watchedState.posts);
    } catch (err) {
      console.error(err);
      watchedState.form.error = err.message;
      watchedState.form.process = 'error';
    }
  });
};

app();
