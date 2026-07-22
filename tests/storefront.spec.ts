import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`catalog to prefilled Telegram order at ${viewport.width}px`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('link', { name: 'Смотреть каталог' }).click();
    const cards = page.getByTestId('product-card');
    await expect(cards).not.toHaveCount(0);
    const card = cards.first();
    const productName = await card.getByRole('heading', {level: 3}).textContent();
    const cardOrderLink = card.getByRole('link', {name: /Написать менеджеру о/});
    const cardOrderUrl = new URL(await cardOrderLink.getAttribute('href') ?? '');
    expect(cardOrderUrl.origin + cardOrderUrl.pathname).toBe('https://t.me/jardinmanager');
    expect(cardOrderUrl.searchParams.get('text')).toContain('Я с сайта Jardin Secret');

    await card.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/product\//);
    const productOrderLink = page.getByRole('link', {name: 'Написать менеджеру'});
    const productOrderUrl = new URL(await productOrderLink.getAttribute('href') ?? '');
    expect(productOrderUrl.searchParams.get('text')).toContain(productName);
    expect(productOrderUrl.searchParams.get('text')).toContain(page.url());

    await page.goto('/register');
    await expect(page.getByRole('heading', {name: 'Создайте свой профиль'})).toBeVisible();
    await expect(page.getByText('Личный кабинет настраивается. Каталог и заказ через Telegram доступны без регистрации.')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Создать аккаунт'})).toBeDisabled();
    expect(consoleErrors).toEqual([]);
  });
}
