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

  test('mobile: the hamburger menu navigates between pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Desktop nav is hidden on mobile
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Trade' })).toBeHidden()

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Trade' }).click()
    await expect(page).toHaveURL('/trade')

    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(page.getByRole('menuitem', { name: 'Trade' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('menuitem', { name: 'Data' }).click()
    await expect(page).toHaveURL('/data')
  })
})
