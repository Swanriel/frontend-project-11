import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import * as yup from "yup";
import View from "./view.js";
import { rssSchema } from "./validation.js";

const form = document.getElementById("rss-form");
const input = form.querySelector("input");
const feedback = document.createElement("div");
feedback.classList.add("feedback", "mt-2");
form.after(feedback);

const view = new View(form, input, feedback);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const url = formData.get("url").trim();

  rssSchema(view.state.feeds)
    .validate({ url }, { abortEarly: false })
    .then(() => {
      view.state.feeds.push(url);
      view.resetForm();
    })
    .catch((err) => {
      view.state.form.valid = false;
      view.state.form.error = err.errors.join(", ");
    });
});

input.addEventListener("input", () => {
  view.state.form.value = input.value;
});
