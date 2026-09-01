import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('C:\\Users\\czc\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'design-qa')
await mkdir(output, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
})
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', (error) => errors.push(error.message))

await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' })
await page.screenshot({ path: path.join(output, 'login-desktop.png'), fullPage: true })
await page.getByLabel('管理员账号').fill('admin')
await page.getByLabel('密码').fill('admin-test-password')
await page.getByRole('button', { name: '登录后台' }).click()
await page.getByRole('heading', { name: '数据概览' }).waitFor()
await page.screenshot({ path: path.join(output, 'dashboard-desktop.png'), fullPage: true })

await page.getByRole('link', { name: '课程管理' }).click()
await page.getByRole('heading', { name: '课程管理' }).waitFor()
await page.locator('tbody tr').first().waitFor()
await page.screenshot({ path: path.join(output, 'courses-desktop.png'), fullPage: true })
await page.getByTitle('编辑').first().click()
await page.getByRole('heading', { name: '编辑课程' }).waitFor()
await page.screenshot({ path: path.join(output, 'course-editor-desktop.png'), fullPage: true })
await page.keyboard.press('Escape')

await page.setViewportSize({ width: 820, height: 1080 })
await page.goto('http://127.0.0.1:5174/#/dashboard', { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '数据概览' }).waitFor()
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(output, 'dashboard-tablet.png'), fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.goto('http://127.0.0.1:5174/#/courses', { waitUntil: 'networkidle' })
await page.locator('tbody tr').first().waitFor()
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(output, 'courses-mobile.png'), fullPage: true })
await page.getByRole('button', { name: '打开导航' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(output, 'navigation-mobile.png'), fullPage: true })

await browser.close()
if (errors.length) {
  console.error(JSON.stringify({ errors }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ screenshots: 7, errors: 0, output }, null, 2))
}
