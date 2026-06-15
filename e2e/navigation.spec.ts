import { test, expect } from '@playwright/test'

test.describe('navigation', () => {
  test('home page renders the header nav and the map', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Votations' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Demographics' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Trade' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Data' })).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('navigates to the demographics page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Demographics' }).click()
    await expect(page).toHaveURL('/demographics')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('navigates to the trade page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Trade' }).click()
    await expect(page).toHaveURL('/trade')
    await expect(page.getByText('Foreign Trade 2024')).toBeVisible()
  })

  test('navigates to the data sources page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Data' }).click()
    await expect(page).toHaveURL('/data')
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible()
  })
})
