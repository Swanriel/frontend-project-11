import './i18n'
import 'bootstrap/dist/css/bootstrap.min.css'
import axios from 'axios'
import uniqueId from 'lodash/uniqueId'
import onChange from 'on-change'
import { i18n } from './i18n'
import { rssSchema } from './validation'

const parseRSS = (xmlString) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('invalidRSS')

  const channel = doc.querySelector('channel, feed')
  const items = doc.querySelectorAll('item, entry')

  const feedTitle = channel.querySelector('title').textContent;
  const feedDescription = channel.querySelector('description, subtitle')?.textContent || ''

  const posts = Array.from(items).map((item) => {
    const linkElement = item.querySelector('link')
    return {
      id: uniqueId(),
      title: item.querySelector('title').textContent,
      link: linkElement?.getAttribute('href') || linkElement?.textContent || '#',
      description: item.querySelector('description, content')?.textContent || '',
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
    ${feeds.length === 0
      ? `<p class="text-muted">${i18n.t('feeds.empty')}</p>`
      : feeds.map(feed => `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${feed.title}</h5>
            <p class="card-text">${feed.description}</p>
          </div>
        </div>
      `).join('')
    }
  `;
};

const renderPosts = (posts, viewedPostIds, container) => {
  const prevPostsContainer = container.querySelector('.posts-container')
  if (prevPostsContainer) {
    container.removeChild(prevPostsContainer);
  }

  const postsContainer = document.createElement('div')
  postsContainer.className = 'posts-container mt-4'
  postsContainer.innerHTML = `
    <h2>${i18n.t('posts.title')}</h2>
    <div class="list-group">
      ${posts.length === 0
        ? `<p class="text-muted">${i18n.t('posts.empty')}</p>`
        : posts.map(post => {
          const isViewed = viewedPostIds.has(post.id)
          return `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <a href="${post.link}" 
                 class="${isViewed ? 'fw-normal' : 'fw-bold'}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 data-id="${post.id}">
                ${post.title}
              </a>
              <button type="button" 
                      class="btn btn-sm btn-outline-primary preview-btn" 
                      data-id="${post.id}"
                      data-bs-toggle="modal" 
                      data-bs-target="#postModal">
                ${i18n.t('posts.preview')}
              </button>
            </div>
          `;
        }).join('')
      }
    </div>
  `;
  container.appendChild(postsContainer)
};

const initModal = () => {
  if (!document.getElementById('postModal')) {
    const modalHTML = `
    <div class="modal fade" id="postModal" tabindex="-1" aria-labelledby="postModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="postModalLabel"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="post-content"></div>
          </div>
          <div class="modal-footer">
            <a href="#" class="btn btn-primary read-full" target="_blank">${i18n.t('Читать полностью')}</a>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18n.t('Закрыть')}</button>
          </div>
        </div>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML)
  }
  return new bootstrap.Modal(document.getElementById('postModal'))
};

const checkForUpdates = (state) => {
  if (state.feeds.length === 0) return

  state.feeds.forEach(async (feed) => {
    try {
      const encodedUrl = encodeURIComponent(feed.url)
      const proxyUrl = `https://allorigins.hexlet.app/get?url=${encodedUrl}&disableCache=true`
      const response = await axios.get(proxyUrl, { timeout: 5000 })

      if (!response.data?.contents) return

      const { posts: newPosts } = parseRSS(response.data.contents)
      const existingPostLinks = new Set(state.posts.map(post => post.link))
      
      const uniqueNewPosts = newPosts.filter(
        post => !existingPostLinks.has(post.link)
      );

      if (uniqueNewPosts.length > 0) {
        state.posts.unshift(...uniqueNewPosts)
      }
    } catch (err) {
      console.error(`Error updating feed ${feed.url}:`, err)
    }
  })
}

const app = () => {
  const modal = initModal()
  const modalElement = document.getElementById('postModal')

  const state = {
    form: {
      process: 'filling',
      error: null,
      valid: true,
      feedback: null,
    },
    feeds: [],
    posts: [],
    ui: {
      viewedPostIds: new Set(),
      currentPost: null,
    },
  };

  const elements = {
    formEl: document.getElementById('rss-form'),
    inputEl: document.getElementById('url-input'),
    invalidFeedbackEl: document.querySelector('.invalid-feedback'),
    validFeedbackEl: document.querySelector('.valid-feedback'),
    submitBtn: document.getElementById('submit-btn'),
    submitText: document.getElementById('submit-text'),
    submitSpinner: document.getElementById('submit-spinner'),
    feedsContainer: document.getElementById('feeds-container'),
    titleEl: document.querySelector('h1'),
    labelEl: document.querySelector('label[for="url-input"]'),
  };

  const updateModalContent = (postId) => {
    const post = state.posts.find(p => p.id === postId)
    if (!post) return;

    document.getElementById('postModalLabel').textContent = post.title
    document.querySelector('.post-content').textContent = post.description
    document.querySelector('.read-full').href = post.link
    state.ui.currentPost = postId
  };

  const updateUITexts = () => {
    elements.titleEl.textContent = i18n.t('form.title')
    elements.labelEl.textContent = i18n.t('form.label')
    elements.inputEl.placeholder = i18n.t('form.placeholder')
    elements.submitText.textContent = i18n.t('form.submit')
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      elements.inputEl.classList.toggle('is-invalid', !!state.form.error)
      elements.invalidFeedbackEl.textContent = state.form.error
        ? i18n.t(`errors.${state.form.error}`)
        : '';
      elements.invalidFeedbackEl.style.display = state.form.error ? 'block' : 'none'
    }

    if (path === 'form.process' || path === 'form.feedback') {
      switch (state.form.process) {
        case 'sending':
          elements.submitBtn.disabled = true
          elements.submitText.textContent = i18n.t('form.loading')
          elements.submitSpinner.classList.remove('d-none')
          elements.validFeedbackEl.style.display = 'none'
          break
          case 'success':
          elements.formEl.reset()
          elements.inputEl.focus()
          elements.submitBtn.disabled = false
          elements.submitText.textContent = i18n.t('form.submit')
          elements.submitSpinner.classList.add('d-none')
          elements.inputEl.classList.remove('is-invalid')
          elements.validFeedbackEl.textContent = state.form.feedback
          elements.validFeedbackEl.style.display = 'block'
          elements.invalidFeedbackEl.style.display = 'none'
          break
        case 'error':
          elements.submitBtn.disabled = false
          elements.submitText.textContent = i18n.t('form.submit')
          elements.submitSpinner.classList.add('d-none')
          elements.validFeedbackEl.style.display = 'none'
          break
        default:
          break
      }
    }

    if (path === 'feeds') {
      renderFeeds(state.feeds, elements.feedsContainer)
    }

    if (path === 'posts' || path === 'ui.viewedPostIds') {
      renderPosts(state.posts, state.ui.viewedPostIds, elements.feedsContainer)
    }
  });

  const startUpdateTimer = () => {
    setTimeout(() => {
      checkForUpdates(watchedState)
      startUpdateTimer()
    }, 5000)
  }

  elements.formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target)
    const url = formData.get('url').trim()

    try {
      await rssSchema(state.feeds.map((f) => f.url)).validate({ url })
      watchedState.form.process = 'sending'
      watchedState.form.error = null

      const encodedUrl = encodeURIComponent(url)
      const proxyUrl = `https://allorigins.hexlet.app/get?url=${encodedUrl}&disableCache=true`
      const response = await axios.get(proxyUrl, { timeout: 10000 })

      if (!response.data?.contents) throw new Error('networkError')

      const { feed, posts } = parseRSS(response.data.contents)
      const feedWithUrl = { ...feed, url }

      watchedState.feeds.unshift(feedWithUrl)
      watchedState.posts.unshift(...posts)
      watchedState.form.process = 'success'
      watchedState.form.feedback = i18n.t('success')

      if (watchedState.feeds.length === 1) {
        startUpdateTimer()
      }
    } catch (err) {
      console.error('Error:', err)
      watchedState.form.error = getErrorKey(err)
      watchedState.form.process = 'error'
    }
  });

  const getErrorKey = (err) => {
    if (err.name === 'AxiosError') {
      if (err.code === 'ECONNABORTED') return 'timeout'
      return 'networkError'
    }

    switch (err.message) {
      case 'invalidRSS':
        return 'invalidRSS'
      case 'networkError':
        return 'networkError'
      default:
        return err.type || 'unknown'
    }
  }

  elements.feedsContainer.addEventListener('click', (e) => {
    const postLink = e.target.closest('a')
    if (postLink) {
      const { id } = postLink.dataset
      watchedState.ui.viewedPostIds.add(id)
    }

    const previewBtn = e.target.closest('.preview-btn')
    if (previewBtn) {
      const { id } = previewBtn.dataset
      watchedState.ui.viewedPostIds.add(id)
      updateModalContent(id)
    }
  });

  modalElement.addEventListener('show.bs.modal', () => {
    if (state.ui.currentPost) {
      watchedState.ui.viewedPostIds.add(state.ui.currentPost)
    }
  })

  modalElement.addEventListener('hidden.bs.modal', () => {
    watchedState.ui.currentPost = null
  });

  i18n.on('loaded', updateUITexts)
  i18n.on('languageChanged', updateUITexts)

  document.querySelectorAll('[data-lng]').forEach((btn) => {
    btn.addEventListener('click', () => {
      i18n.changeLanguage(btn.dataset.lng)
    })
  })

  updateUITexts()
}

app()
