import onChange from 'on-change';

export default (state, formEl, inputEl) => {
  const watchedState = onChange(state, (path) => {
    if (path === 'form.error') {
      inputEl.classList.toggle('is-invalid', !!state.form.error);
      const feedbackEl = inputEl.nextElementSibling;
      if (feedbackEl) feedbackEl.textContent = state.form.error || '';
    }
    if (path === 'form.process') {
      if (state.form.process === 'success') {
        formEl.reset();
        inputEl.focus();
        inputEl.classList.remove('is-invalid');
      }
    }
  });

  return watchedState;
};
