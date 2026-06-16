import { test, expect } from '@playwright/test'

test.describe('demographics', () => {
  test('switching topics updates the selection and map legend', async ({ page }) => {
    await page.goto('/demographics')

    const legend = page.locator('.absolute.bottom-4.left-3')
    const defaultTopic = page.getByRole('button', { name: 'Urban / Periurban / Rural' })
    await expect(defaultTopic).toHaveClass(/text-primary/)
    await expect(legend).toContainText('Urban / Periurban / Rural')

    const density = page.getByRole('button', { name: 'Population density' })
    await density.click()

    await expect(density).toHaveClass(/text-primary/)
    await expect(defaultTopic).not.toHaveClass(/text-primary/)
    await expect(legend).toContainText('Population density')
  })
})
