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
      process: 'filling', // filling, sending, success, error
      error: null,
      valid: true,
    },
    feeds: [],
    posts: [],
    ui: {
      viewedPostIds: new Set(),
    },
  };

  // Элементы DOM
  const elements = {
    formEl: document.getElementById('rss-form'),
    inputEl: document.getElementById('url-input'),
    feedbackEl: document.querySelector('.invalid-feedback'),
    feedsContainer: document.getElementById('feeds-container'),
  };

  // Инициализация View
  const watchedState = view(state, elements.formEl, elements.inputEl);

  // Рендер фидов
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

  // Рендер постов
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

  // Парсер RSS
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

  // Обработчик формы
  elements.formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim();

    try {
      await rssSchema(watchedState.feeds).validate({ url });
      watchedState.form.process = 'sending';

      // Загрузка через прокси
      const proxyUrl = `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}&disableCache=true`;
      const response = await axios.get(proxyUrl);

      if (!response.data.contents) throw new Error('Network error');

      const { feed, posts } = parseRSS(response.data.contents);
      watchedState.feeds.push(feed);
      watchedState.posts.push(...posts);
      watchedState.form.process = 'success';

      // Рендер после успешной загрузки
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
