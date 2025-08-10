import onChange from 'on-change';

export default (state, formEl, inputEl, feedbackEl) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      inputEl.classList.toggle('is-invalid', !!state.form.error);
      feedbackEl.textContent = state.form.error || '';
      feedbackEl.style.display = state.form.error ? 'block' : 'none';
    }
    if (path === 'form.process' && state.form.process === 'success') {
      formEl.reset();
      inputEl.focus();
      inputEl.classList.remove('is-invalid');
    }
  });

  return watchedState;
};
