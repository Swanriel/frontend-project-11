import * as yup from 'yup';

export const rssSchema = (existingFeeds) =>
  yup.object().shape({
    url: yup.string().trim().required().url().notOneOf(existingFeeds),
  });
