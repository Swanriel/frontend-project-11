import "bootstrap/dist/css/bootstrap.min.css";
import * as yup from "yup";
import onChange from "on-change";

// Схема валидации
const createSchema = (feeds) =>
  yup.object({
    url: yup
      .string()
      .required("URL is required")
      .url("Must be a valid URL")
      .notOneOf(feeds, "This RSS feed already exists"),
  });

// Состояние приложения
const state = onChange(
  {
    feeds: [],
    form: {
      state: "filling",
      error: null,
      valid: true,
      value: "",
    },
  },
  (path) => {
    if (path === "form.error" || path === "form.valid") {
      updateUI();
    }
  },
);

// Элементы DOM
const form = document.getElementById("rss-form");
const input = document.getElementById("url-input");
const feedback = document.querySelector(".invalid-feedback");

// Обработчики событий
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const url = formData.get("url").trim();

  validateUrl(url)
    .then(() => {
      state.feeds.push(url);
      state.form.state = "success";
      state.form.error = null;
      state.form.valid = true;
      form.reset();
      input.focus();
    })
    .catch((err) => {
      state.form.state = "error";
      state.form.error = err.message;
      state.form.valid = false;
    });
});

input.addEventListener("input", (e) => {
  state.form.value = e.target.value;
});

// Функция валидации
function validateUrl(url) {
  return createSchema(state.feeds).validate({ url }, { abortEarly: false });
}

// Обновление UI
function updateUI() {
  if (!state.form.valid) {
    input.classList.add("is-invalid");
    feedback.textContent = state.form.error;
  } else {
    input.classList.remove("is-invalid");
    feedback.textContent = "";
  }
}
