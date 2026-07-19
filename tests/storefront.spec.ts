import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`catalog to Telegram checkout at ${viewport.width}px`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('link', { name: 'Смотреть каталог' }).click();
    const cards = page.getByTestId('product-card');
    await expect(cards).not.toHaveCount(0);
    await cards.first().getByRole('button', { name: /Добавить/ }).click();
    await page.getByRole('link', { name: /Корзина, товаров: 1/ }).click();
    await page.getByRole('link', { name: 'Оформить заказ' }).click();
    await page.getByLabel('Имя').fill('Анна');
    await page.getByLabel('Телефон').fill('+7 999 000-00-00');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес или пункт выдачи').fill('ПВЗ на Тверской');
    await page.getByLabel('Способ доставки').selectOption('СДЭК');
    await page.getByRole('button', { name: 'Сформировать заказ' }).click();
    await expect(page.getByRole('textbox', { name: 'Готовый текст заказа' })).toHaveValue(/Анна/);
    await expect(page.getByRole('link', { name: 'Открыть @jardinmanager' })).toHaveAttribute('href', 'https://t.me/jardinmanager');
    expect(consoleErrors).toEqual([]);
  });
}
