import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import uniqueId from 'lodash/uniqueId';
import { rssSchema } from './validation.js';

const parseRSS = (xmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('invalidRSS');

  const channel = doc.querySelector('channel, feed');
  const items = doc.querySelectorAll('item, entry');

  const feedTitle = channel.querySelector('title').textContent;
  const feedDescription =
    channel.querySelector('description, subtitle')?.textContent || '';

  const posts = Array.from(items).map((item) => {
    const linkElement = item.querySelector('link');
    return {
      id: uniqueId(),
      title: item.querySelector('title').textContent,
      link:
        linkElement?.getAttribute('href') || linkElement?.textContent || '#',
      description:
        item.querySelector('description, content')?.textContent || '',
    };
  });

  return {
    feed: { id: uniqueId(), title: feedTitle, description: feedDescription },
    posts,
  };
};

const app = () => {
  const state = {
    form: {
      process: 'filling',
      error: null,
      valid: true,
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
    submitBtn: document.getElementById('submit-btn'),
    submitText: document.getElementById('submit-text'),
    submitSpinner: document.getElementById('submit-spinner'),
    feedsContainer: document.getElementById('feeds-container'),
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      elements.inputEl.classList.toggle('is-invalid', !!state.form.error);
      elements.feedbackEl.textContent = state.form.error || '';
      elements.feedbackEl.style.display = state.form.error ? 'block' : 'none';
    }

    if (path === 'form.process') {
      switch (state.form.process) {
        case 'sending':
          elements.submitBtn.disabled = true;
          elements.submitText.textContent = 'Loading...';
          elements.submitSpinner.classList.remove('d-none');
          break;
        case 'success':
          elements.formEl.reset();
          elements.inputEl.focus();
          elements.submitBtn.disabled = false;
          elements.submitText.textContent = 'Add feed';
          elements.submitSpinner.classList.add('d-none');
          elements.inputEl.classList.remove('is-invalid');
          state.form.error = null;
          break;
        case 'error':
          elements.submitBtn.disabled = false;
          elements.submitText.textContent = 'Add feed';
          elements.submitSpinner.classList.add('d-none');
          break;
        default:
          break;
      }
    }

    if (path === 'feeds') {
      renderFeeds();
    }

    if (path === 'posts') {
      renderPosts();
    }
  });

  const renderFeeds = () => {
    elements.feedsContainer.innerHTML = state.feeds
      .map(
        (feed) => `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${feed.title}</h5>
          <p class="card-text">${feed.description}</p>
        </div>
      </div>
    `,
      )
      .join('');
  };

  const renderPosts = () => {
    const postsHtml = state.posts
      .map(
        (post) => `
      <a href="${post.link}" 
         class="list-group-item list-group-item-action ${state.ui.viewedPostIds.has(post.id) ? 'text-secondary' : 'fw-bold'}" 
         target="_blank" 
         rel="noopener noreferrer"
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

      if (!response.data?.contents) throw new Error('networkError');

      const { feed, posts } = parseRSS(response.data.contents);
      const feedWithUrl = { ...feed, url };

      watchedState.feeds.unshift(feedWithUrl);
      watchedState.posts.unshift(...posts);
      watchedState.form.process = 'success';
    } catch (err) {
      console.error(err);
      watchedState.form.error = getErrorMessage(err);
      watchedState.form.process = 'error';
    }
  });

  elements.feedsContainer.addEventListener('click', (e) => {
    const postLink = e.target.closest('[data-id]');
    if (postLink) {
      const postId = postLink.dataset.id;
      watchedState.ui.viewedPostIds.add(postId);
    }
  });

  function getErrorMessage(err) {
    switch (err.message) {
      case 'invalidRSS':
        return 'Ресурс не содержит валидный RSS/Atom';
      case 'networkError':
        return 'Ошибка сети. Проверьте URL и попробуйте снова';
      case 'This RSS feed already exists':
        return 'Этот RSS-канал уже добавлен';
      case 'URL is required':
        return 'Введите URL RSS-канала';
      case 'Must be a valid URL':
        return 'Введите корректный URL';
      default:
        return 'Неизвестная ошибка';
    }
  }
};

app();
