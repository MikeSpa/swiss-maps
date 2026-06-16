import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('accessibility', () => {
  test('votations page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/')
    // Wait for the sidebar date buttons to load before scanning — they load async
    await expect(page.getByRole('button', { name: /\d{2}\.\d{2}\.\d{4}/ }).first()).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .exclude('canvas') // MapLibre GL canvas is opaque to axe
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(violations).toEqual([])
  })

  test('demographics page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/demographics')
    await expect(page.locator('main')).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .exclude('canvas')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(violations).toEqual([])
  })

  test('trade page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/trade')
    // Wait for trade data to load — the sidebar only renders coloured values after the fetch
    await expect(page.getByText('Top Partners')).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(violations).toEqual([])
  })

  test('data page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/data')
    await expect(page.locator('main')).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(violations).toEqual([])
  })
})
