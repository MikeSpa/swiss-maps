import { test, expect } from '@playwright/test'

test.describe('trade', () => {
  test('shows partners sorted by trade volume', async ({ page }) => {
    await page.goto('/trade')
    const firstRow = page.locator('button span.truncate.font-medium').first()
    await expect(firstRow).toHaveText('Germany')
  })

  test('filters the partner list by agreement status', async ({ page }) => {
    await page.goto('/trade')

    await page.getByRole('button', { name: 'Framework', exact: true }).click()
    await expect(page.getByText('Top Partners (1)')).toBeVisible()
    await expect(page.locator('button span.truncate.font-medium')).toHaveText(['USA'])
  })

  test('filters the partner list by sector', async ({ page }) => {
    await page.goto('/trade')

    await page.getByRole('button', { name: 'Pharma', exact: true }).click()
    await expect(page.getByText(/^Pharma \(\d+\)$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'CHF', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '%', exact: true })).toBeVisible()
  })

  test('filters the partner list by search', async ({ page }) => {
    await page.goto('/trade')

    await page.getByRole('searchbox').fill('Slovenia')
    await expect(page.getByText('Top Partners (1)')).toBeVisible()
    await expect(page.locator('button span.truncate.font-medium')).toHaveText(['Slovenia'])

    await page.getByRole('searchbox').fill('zzzzz')
    await expect(page.getByText('No match for "zzzzz"')).toBeVisible()
  })

  test('selecting a partner shows its details and can be closed', async ({ page }) => {
    await page.goto('/trade')

    await page.locator('button span.truncate.font-medium', { hasText: 'Germany' }).click()

    const card = page.locator('p.font-semibold', { hasText: 'Germany' }).locator('../..')
    await expect(card).toContainText('EU Bilateral')

    await card.locator('p.font-semibold', { hasText: 'Germany' }).locator('..').getByRole('button').click()
    await expect(page.getByText('EU Bilateral')).not.toBeVisible()
  })
})
