import * as yup from 'yup'

export const rssSchema = yup.object().shape({
  url: yup
    .string()
    .required('URL required')
    .url('Incorrect URL')
    .test(
      'is-unique',
      'RSS already existed',
      (value, { parent: { feeds } }) => !feeds.includes(value)
    ),
})
