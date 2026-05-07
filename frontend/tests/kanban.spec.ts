import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill('user');
  await page.getByPlaceholder('Password').fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: 'Kanban Studio' })).toBeVisible();
});

test('loads the kanban board', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kanban Studio' })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test('adds a card to a column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole('button', { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder('Card title').fill('Playwright card');
  await firstColumn.getByPlaceholder('Details').fill('Added via e2e.');
  await firstColumn.getByRole('button', { name: /add card/i }).click();
  await expect(firstColumn.getByText('Playwright card')).toBeVisible();
});

test('moves a card between columns', async ({ page }) => {
  const card = page.getByTestId('card-card-1');
  const targetColumn = page.getByTestId('column-col-review');
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error('Unable to resolve drag coordinates.');
  }

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(targetColumn.getByTestId('card-card-1')).toBeVisible();
});

test('renames a column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const input = firstColumn.getByLabel('Column title');
  await input.fill('Renamed Column');
  await expect(input).toHaveValue('Renamed Column');
});

test('logs out successfully', async ({ page }) => {
  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

test('shows AI chat sidebar', async ({ page }) => {
  await expect(page.getByRole('complementary', { name: /AI chat sidebar/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible();
  await expect(page.getByLabel('Message input')).toBeVisible();
});

test('AI chat sends message and shows response', async ({ page }) => {
  // Intercept the AI chat endpoint to avoid real API calls
  await page.route('**/api/ai/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'I have noted your request.',
        operations: [],
        board: null,
      }),
    }),
  );

  await page.getByLabel('Message input').fill('What cards are in To Do?');
  await page.getByRole('button', { name: /send/i }).click();

  await expect(page.getByText('What cards are in To Do?')).toBeVisible();
  await expect(page.getByText('I have noted your request.')).toBeVisible();
});
