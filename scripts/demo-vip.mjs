import { chromium } from 'playwright'
import path from 'node:path'

const outDir = '/opt/cursor/artifacts'
const url = 'http://127.0.0.1:5173/'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
})
const page = await context.newPage()

await page.goto(url, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '开通会员' }).click()
await page.locator('[data-package-type="year"]').waitFor()

await page.screenshot({
  path: path.join(outDir, 'vip-modal-year-selected.png'),
  fullPage: true,
})

await page.locator('[data-package-type="month"]').click()
await page.waitForTimeout(400)
await page.screenshot({
  path: path.join(outDir, 'vip-modal-month-selected.png'),
  fullPage: true,
})

await page.locator('[data-package-type="year"]').click()
await page.getByRole('button', { name: '立即开通' }).click()
await page.getByTestId('vip-status').getByText('已开通').waitFor({ timeout: 5000 })
await page.waitForTimeout(500)
await page.screenshot({
  path: path.join(outDir, 'vip-modal-pay-success.png'),
  fullPage: true,
})

const video = page.video()
await context.close()
await browser.close()
if (video) {
  const videoPath = await video.path()
  console.log('video:', videoPath)
}
console.log('demo screenshots saved to', outDir)
