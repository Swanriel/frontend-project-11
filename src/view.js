export default class View {
  constructor(form, input, feedback) {
    this.form = form;
    this.input = input;
    this.feedback = feedback;
  }

  render(formState) {
    switch (formState.state) {
      case "sending":
        this.input.setAttribute("readonly", true);
        break;
      case "error":
        this.input.classList.add("is-invalid");
        this.feedback.textContent = formState.error;
        this.feedback.style.display = "block";
        this.input.removeAttribute("readonly");
        break;
      case "success":
        this.input.classList.remove("is-invalid");
        this.feedback.style.display = "none";
        this.input.removeAttribute("readonly");
        break;
      default:
        if (formState.valid) {
          this.input.classList.remove("is-invalid");
          this.feedback.style.display = "none";
        }
        this.input.removeAttribute("readonly");
    }
  }

  resetForm() {
    this.form.reset();
    this.input.focus();
  }
}
