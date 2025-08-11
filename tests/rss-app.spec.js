import { test, expect } from '@playwright/test';

test.describe('RSS Агрегатор', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      'https://frontend-project-11-97taoknlf-olesias-projects-3a68a2a5.vercel.app/',
    );
    await page.waitForSelector('h1');
  });

  test('Должен отображать основные элементы формы', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByLabel('Ссылка RSS')).toBeVisible();
    await expect(
      page.getByPlaceholder('https://example.com/rss.xml'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Добавить' })).toBeVisible();
  });

  test('Должен показывать ошибку при невалидном URL', async ({ page }) => {
    await page
      .getByPlaceholder('https://example.com/rss.xml')
      .fill('не-ссылка');
    await page.getByRole('button', { name: 'Добавить' }).click();
    await expect(
      page.getByText(/Ссылка должна быть валидным URL|Invalid URL/),
    ).toBeVisible();
  });

  test('Должен успешно загружать RSS', async ({ page }) => {
    await page.route('**/get?url=*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contents: `<?xml version="1.0"?>
          <rss><channel>
            <title>Тестовый фид</title>
            <description>Тестовое описание</description>
            <item>
              <title>Тестовый пост</title>
              <link>https://example.com/test</link>
              <description>Тестовое содержание</description>
            </item>
          </channel></rss>`,
        }),
      });
    });

    await page
      .getByPlaceholder('https://example.com/rss.xml')
      .fill('https://example.com/valid.rss');
    await page.getByRole('button', { name: 'Добавить' }).click();
    await expect(
      page.getByText(/RSS успешно загружен|RSS successfully loaded/),
    ).toBeVisible();
    await expect(page.getByText('Тестовый фид')).toBeVisible();
    await expect(page.getByText('Тестовый пост')).toBeVisible();
  });
});
