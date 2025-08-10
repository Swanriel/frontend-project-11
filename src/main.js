import './i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import uniqueId from 'lodash/uniqueId';
import onChange from 'on-change';
import { i18n } from './i18n';
import { rssSchema } from './validation';

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

const renderFeeds = (feeds, container) => {
  container.innerHTML = `
    <h2>${i18n.t('feeds.title')}</h2>
    ${
      feeds.length === 0
        ? `<p class="text-muted">${i18n.t('feeds.empty')}</p>`
        : feeds
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
            .join('')
    }
  `;
};

const renderPosts = (posts, viewedPostIds, container) => {
  const postsContainer = document.createElement('div');
  postsContainer.className = 'mt-4';
  postsContainer.innerHTML = `
    <h2>${i18n.t('posts.title')}</h2>
    <div class="list-group">
      ${
        posts.length === 0
          ? `<p class="text-muted">${i18n.t('posts.empty')}</p>`
          : posts
              .map((post) => {
                const isViewed = viewedPostIds.has(post.id);
                return `
            <a href="${post.link}" 
               class="list-group-item list-group-item-action ${isViewed ? 'text-secondary' : 'fw-bold'}" 
               target="_blank" 
               rel="noopener noreferrer"
               data-id="${post.id}">
              ${post.title}
            </a>
          `;
              })
              .join('')
      }
    </div>
  `;
  container.appendChild(postsContainer);
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
    titleEl: document.querySelector('h1'),
    labelEl: document.querySelector('label[for="url-input"]'),
  };

  const updateUITexts = () => {
    elements.titleEl.textContent = i18n.t('app.title');
    elements.labelEl.textContent = i18n.t('form.label');
    elements.inputEl.placeholder = i18n.t('form.placeholder');
    elements.submitText.textContent = i18n.t('form.submit');
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      elements.inputEl.classList.toggle('is-invalid', !!state.form.error);
      elements.feedbackEl.textContent = state.form.error
        ? i18n.t(`errors.${state.form.error}`)
        : '';
      elements.feedbackEl.style.display = state.form.error ? 'block' : 'none';
    }

    if (path === 'form.process') {
      switch (state.form.process) {
        case 'sending':
          elements.submitBtn.disabled = true;
          elements.submitText.textContent = i18n.t('form.loading');
          elements.submitSpinner.classList.remove('d-none');
          break;
        case 'success':
          elements.formEl.reset();
          elements.inputEl.focus();
          elements.submitBtn.disabled = false;
          elements.submitText.textContent = i18n.t('form.submit');
          elements.submitSpinner.classList.add('d-none');
          elements.inputEl.classList.remove('is-invalid');
          state.form.error = null;
          break;
        case 'error':
          elements.submitBtn.disabled = false;
          elements.submitText.textContent = i18n.t('form.submit');
          elements.submitSpinner.classList.add('d-none');
          break;
        default:
          break;
      }
    }

    if (path === 'feeds') {
      renderFeeds(state.feeds, elements.feedsContainer, i18n);
    }

    if (path === 'posts' || path === 'ui.viewedPostIds') {
      renderPosts(
        state.posts,
        state.ui.viewedPostIds,
        elements.feedsContainer,
        i18n,
      );
    }
  });

  elements.formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim();

    try {
      await rssSchema(state.feeds.map((f) => f.url)).validate({ url });
      watchedState.form.process = 'sending';
      watchedState.form.error = null;

      const encodedUrl = encodeURIComponent(url);
      const proxyUrl = `https://allorigins.hexlet.app/get?url=${encodedUrl}&disableCache=true`;
      const response = await axios.get(proxyUrl, { timeout: 10000 });

      if (!response.data?.contents) throw new Error('networkError');

      const { feed, posts } = parseRSS(response.data.contents);
      const feedWithUrl = { ...feed, url };

      watchedState.feeds.unshift(feedWithUrl);
      watchedState.posts.unshift(...posts);
      watchedState.form.process = 'success';
    } catch (err) {
      console.error('Error:', err);
      watchedState.form.error = getErrorKey(err);
      watchedState.form.process = 'error';
    }
  });

  const getErrorKey = (err) => {
    if (err.name === 'AxiosError') {
      if (err.code === 'ECONNABORTED') return 'timeout';
      return 'networkError';
    }

    switch (err.message) {
      case 'invalidRSS':
        return 'invalidRSS';
      case 'networkError':
        return 'networkError';
      default:
        return err.type || 'unknown';
    }
  };

  elements.feedsContainer.addEventListener('click', (e) => {
    const postLink = e.target.closest('[data-id]');
    if (postLink) {
      const { id } = postLink.dataset;
      watchedState.ui.viewedPostIds.add(id);
    }
  });

  i18n.on('loaded', updateUITexts);
  i18n.on('languageChanged', updateUITexts);

  document.querySelectorAll('[data-lng]').forEach((btn) => {
    btn.addEventListener('click', () => {
      i18n.changeLanguage(btn.dataset.lng);
    });
  });
};

app();
