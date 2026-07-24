import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('keeps the rendered DOM bounded for 50,000 indexed nodes', async ({
  page,
}) => {
  await expect(page).toHaveTitle(/Virtual Tree Kit/)
  await expect(page.getByTestId('indexed-count')).toHaveText('50,000')
  await expect(page.getByTestId('visible-count')).toHaveText('50,000')
  await expect(page.getByTestId('mounted-count')).toHaveText('20')
  await expect(page.getByTestId('mounted-ratio')).toHaveText('0.040%')

  const tree = page.getByRole('tree', {
    name: 'Virtual Tree Kit repository files',
  })
  await expect(tree.getByRole('treeitem')).toHaveCount(20)
  await expect
    .poll(async () => tree.evaluate((element) => element.scrollHeight))
    .toBe(1_600_000)
})

test('navigates, scrolls, types ahead, and selects with one DOM focus target', async ({
  page,
}) => {
  const tree = page.getByRole('tree', {
    name: 'Virtual Tree Kit repository files',
  })
  await tree.focus()

  await page.keyboard.press('End')
  await expect(tree).toBeFocused()
  await expect(tree.locator('[role="treeitem"][data-active]')).toHaveCount(1)
  await expect
    .poll(async () => tree.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)

  await page.keyboard.press('Home')
  await expect(tree.locator('[role="treeitem"][data-active]')).toContainText(
    'virtual-tree-kit',
  )
  await page.keyboard.press('ArrowRight')
  await expect(tree.locator('[role="treeitem"][data-active]')).toContainText(
    'apps',
  )
  await page.keyboard.press('d')
  await expect(tree.locator('[role="treeitem"][data-active]')).toContainText(
    'docs',
  )

  await page.keyboard.press('Enter')
  await expect(page.getByTestId('active-path')).toHaveText('docs')
  await expect(tree).toBeFocused()
})

test('rebuilds the fixture while preserving a bounded mounted range', async ({
  page,
}) => {
  await page.getByRole('button', { name: '1K' }).click()
  await expect(page.getByTestId('indexed-count')).toHaveText('1,000')
  await expect(page.getByTestId('visible-count')).toHaveText('1,000')
  await expect(page.getByTestId('mounted-count')).toHaveText('20')

  await page.getByRole('button', { name: 'Collapse' }).click()
  await expect(page.getByTestId('visible-count')).toHaveText('9')
  await expect(page.getByRole('treeitem')).toHaveCount(9)
})

test('has no automatically detectable accessibility violations', async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})
