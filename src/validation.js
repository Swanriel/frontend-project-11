import * as yup from "yup";

export const rssSchema = (feeds) =>
  yup.object().shape({
    url: yup
      .string()
      .required("URL is required")
      .url("Must be a valid URL")
      .notOneOf(feeds, "RSS already exists"),
  });
