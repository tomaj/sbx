import { test, expect } from '@playwright/test'

test('redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})

test('login with valid credentials', async ({ page }) => {
  await page.goto('/login')

  await page.fill('#email', 'admin@example.com')
  await page.fill('#password', 'admin123')
  await page.click('button[type=submit]')

  await expect(page).toHaveURL('/')
  await expect(page.locator('h2')).toHaveText('Dashboard')
})

test('login with invalid credentials shows error', async ({ page }) => {
  await page.goto('/login')

  await page.fill('#email', 'admin@example.com')
  await page.fill('#password', 'wrongpassword')
  await page.click('button[type=submit]')

  await expect(page.locator('p.text-red-600')).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('sign out redirects to login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('#email', 'admin@example.com')
  await page.fill('#password', 'admin123')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/')

  await page.click('button:has-text("Sign out")')
  await expect(page).toHaveURL('/login')
})
