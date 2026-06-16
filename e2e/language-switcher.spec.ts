import { test, expect } from '@playwright/test'

test.describe('language switcher', () => {
  test('changes the nav labels when switching language', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Demographics' })).toBeVisible()

    await page.getByRole('button', { name: 'DE', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Demografie' })).toBeVisible()

    await page.getByRole('button', { name: 'FR', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Démographie' })).toBeVisible()

    await page.getByRole('button', { name: 'IT', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Demografia' })).toBeVisible()

    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Demographics' })).toBeVisible()
  })
})
