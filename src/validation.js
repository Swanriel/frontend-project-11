import * as yup from 'yup';

export const rssSchema = (existingFeeds) =>
  yup.object().shape({
    url: yup
      .string()
      .trim()
      .required('URL is required')
      .url('Must be a valid URL')
      .notOneOf(existingFeeds, 'This RSS feed already exists'),
  });
