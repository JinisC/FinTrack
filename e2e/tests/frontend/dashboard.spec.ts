import { expect, test } from '@playwright/test';

// Mock-prijzen (e2e/fixtures/markets.json): bitcoin 65000, ethereum 3200.

test('markt toont de prijzen en opent de grafiek van een coin', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/prices$/);
  await expect(page.getByRole('heading', { name: 'Markt' })).toBeVisible();
  const bitcoin = page.getByRole('row').filter({ hasText: 'Bitcoin' });
  await expect(bitcoin).toContainText('65.000,00');

  await bitcoin.getByRole('link', { name: /Bitcoin/ }).click();

  await expect(page).toHaveURL(/\/prices\/bitcoin$/);
  await expect(page.getByRole('heading', { name: /Bitcoin/ })).toBeVisible();
  await expect(page.locator('[echarts] canvas')).toBeVisible();
});

test('aankoop toevoegen en weer verwijderen via de portfolio', async ({ page }) => {
  const note = `e2e-${Date.now()}`;
  await page.goto('/portfolio');
  await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible();

  await page.getByRole('button', { name: 'Aankoop toevoegen' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Coin' }).click();
  await page.getByRole('option', { name: 'Ethereum (ETH)' }).click();
  // De aankoopprijs wordt vooraf ingevuld met de actuele prijs.
  await expect(dialog.getByLabel('Aankoopprijs per coin (USD)')).toHaveValue('3200');
  await dialog.getByLabel('Aantal').fill('2');
  await dialog.getByLabel('Notitie (optioneel)').fill(note);
  await dialog.getByRole('button', { name: 'Opslaan' }).click();

  await expect(page.getByText('Aankoop toegevoegd')).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: note });
  await expect(row).toContainText('Ethereum');
  await expect(row).toContainText('6.400,00');

  await row.getByRole('button', { name: 'Acties voor deze aankoop' }).click();
  await page.getByRole('menuitem', { name: 'Verwijderen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();

  await expect(page.getByText('Aankoop verwijderd')).toBeVisible();
  await expect(row).toHaveCount(0);
});
