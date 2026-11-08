import { test, expect } from '@playwright/test'

test.describe('shareable URL state', () => {
  test('the URL reflects the selected date and proposal', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '08.03.2026' }).click()
    await page.getByText('Federal Act on Individual Taxation').click()

    await expect(page).toHaveURL(/[?&]d=20260308/)
    await expect(page).toHaveURL(/[?&]v=\d+/)
  })

  test('opening a shared link restores date, proposal and canton', async ({ page }) => {
    await page.goto('/?d=20260308&v=6822&c=1')

    await expect(page.getByRole('button', { name: '08.03.2026' })).toHaveClass(/bg-primary/)
    await expect(page.getByRole('button', { name: '← Switzerland' })).toBeVisible()
    await expect(page.getByText('Zürich').first()).toBeVisible()
  })

  test('an invalid or upcoming date falls back to the latest result', async ({ page }) => {
    await page.goto('/?d=29991231&v=1&c=99')
    await expect(page.getByRole('button', { name: '27.09.2026' })).toHaveClass(/bg-primary/)
  })
})
