import { test, expect, type Page } from '@playwright/test'

const MOBILE = { width: 375, height: 667 }

/** Returns the x-coordinate of the sidebar's bounding box. Negative means off-screen. */
async function sidebarX(page: Page) {
  const box = await page.locator('aside').first().boundingBox()
  return box!.x
}

test.describe('mobile sidebar', () => {
  test('votations — hamburger opens the sidebar, backdrop click closes it', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/')

    // Sidebar starts off-screen
    expect(await sidebarX(page)).toBeLessThan(0)

    // Hamburger is visible on mobile
    const hamburger = page.getByRole('button', { name: 'Toggle sidebar' })
    await expect(hamburger).toBeVisible()
    await hamburger.click()

    // Sidebar slides on-screen
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeGreaterThanOrEqual(0)
    await expect(page.locator('[class*="bg-black"]').first()).toBeVisible()

    // Click the backdrop (outside the sidebar, at x=340 on a 375px viewport)
    await page.locator('[class*="bg-black"]').first().click({ position: { x: 340, y: 300 } })
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeLessThan(0)
  })

  test('trade — hamburger opens the sidebar, X button closes it', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/trade')

    expect(await sidebarX(page)).toBeLessThan(0)

    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeGreaterThanOrEqual(0)

    // First button in the sidebar is the X close button (md:hidden, so only rendered on mobile)
    await page.locator('aside').first().getByRole('button').first().click()
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeLessThan(0)
  })

  test('demographics — hamburger opens the sidebar, X button closes it', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/demographics')

    expect(await sidebarX(page)).toBeLessThan(0)

    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeGreaterThanOrEqual(0)

    await page.locator('aside').first().getByRole('button').first().click()
    await page.waitForTimeout(300)
    expect(await sidebarX(page)).toBeLessThan(0)
  })
})
