import { test, expect } from '@playwright/test'

test.describe('votations', () => {
  test('switching the vote date loads its proposals', async ({ page }) => {
    await page.goto('/')

    const march = page.getByRole('button', { name: '08.03.2026' })
    await march.click()
    await expect(march).toHaveClass(/bg-primary/)
    await expect(page.getByText('Federal Act on Individual Taxation')).toBeVisible()
  })

  test('selecting a proposal shows the national result', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '08.03.2026' }).click()
    await page.getByText('Federal Act on Individual Taxation').click()

    const nationalResult = page.getByText('National result').locator('..')
    await expect(nationalResult).toContainText(/\d+\.\d%/)
    await expect(nationalResult).toContainText('Turnout')
  })

  test('shows cantonal vote counts for double-majority proposals', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '08.03.2026' }).click()
    await page.getByText('Cash is freedom', { exact: false }).click()

    await expect(page.getByText('Cantonal votes')).toBeVisible()
    await expect(page.getByText('of 23')).toBeVisible()
  })

  test('clicking the map selects a canton and shows its result', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: '← Switzerland' })).not.toBeVisible()

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await page.waitForTimeout(2000) // let MapLibre finish loading sources before hit-testing

    const box = await canvas.boundingBox()
    await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } })

    const backButton = page.getByRole('button', { name: '← Switzerland' })
    await expect(backButton).toBeVisible()
    await expect(page.getByText('Canton', { exact: false }).first()).toBeVisible()

    await backButton.click()
    await expect(backButton).not.toBeVisible()
  })

  test('opens the Federal Council explanations modal', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '24.11.2024' }).click()

    await page.getByTitle('Federal Council Explanations').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Federal Council Explanations')).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Full text (PDF)' }).first()).toBeVisible()
  })
})
