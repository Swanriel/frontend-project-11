import onChange from "on-change";

export default class View {
  constructor(form, input, feedback) {
    this.form = form;
    this.input = input;
    this.feedback = feedback;
    this.state = onChange(
      {
        form: {
          valid: true,
          error: null,
          value: "",
        },
        feeds: [],
      },
      this.render.bind(this),
    );
  }

  render(path) {
    if (path === "state.form.error") {
      this.handleError();
    }
    if (path === "state.form.valid") {
      this.handleValidation();
    }
  }

  handleError() {
    this.feedback.textContent = this.state.form.error;
    this.feedback.classList.toggle("text-danger", !this.state.form.valid);
  }

  handleValidation() {
    this.input.classList.toggle("is-invalid", !this.state.form.valid);
  }

  resetForm() {
    this.state.form.value = "";
    this.state.form.error = null;
    this.state.form.valid = true;
    this.input.focus();
  }
}
