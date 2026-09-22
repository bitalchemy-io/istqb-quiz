#!/usr/bin/env node
// Driver für die istqb-quiz App (Vite + React SPA).
// Startet bei Bedarf den Dev-Server, fährt die App mit Playwright an und
// macht Screenshots. Muss AUS DEM PROJEKT-ROOT laufen, damit `playwright`
// aus ./node_modules aufgelöst wird.
//
//   node .claude/skills/run-istqb-quiz/driver.mjs smoke
//   node .claude/skills/run-istqb-quiz/driver.mjs shot home --unlock
//
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_URL = 'http://localhost:5173/istqb-quiz/'

const argv = process.argv.slice(2)
const cmd = argv.find(a => !a.startsWith('-')) ?? 'smoke'
const flag = (name, fallback = null) => {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return fallback
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true
}

const url = flag('url', DEFAULT_URL)
const outDir = resolve(flag('out', `${SKILL_DIR}/screenshots`))
const headed = !!flag('headed')
const unlock = !!flag('unlock')
const mobile = !!flag('mobile')
const light = !!flag('light')

let chromium
try {
  ({ chromium } = await import('playwright'))
} catch {
  die('playwright fehlt. Im Projekt-Root ausführen:\n' +
      '  npm install --no-save playwright && npx playwright install chromium')
}

function die(msg) {
  console.error(`\n✗ ${msg}`)
  process.exit(1)
}
const ok = msg => console.log(`✓ ${msg}`)

async function reachable(u) {
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch { return false }
}

// Dev-Server starten, falls noch keiner läuft. Gibt eine Stop-Funktion zurück.
async function ensureServer() {
  if (await reachable(url)) {
    ok('Dev-Server läuft bereits')
    return () => {}
  }
  console.log('… starte Dev-Server (npm run dev)')
  const proc = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true })
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await reachable(url)) {
      ok(`Dev-Server bereit nach ${((i + 1) * 0.5).toFixed(1)}s`)
      return () => { try { process.kill(-proc.pid) } catch {} }
    }
  }
  try { process.kill(-proc.pid) } catch {}
  die(`Dev-Server wurde unter ${url} nicht erreichbar`)
}

async function openApp(browser) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    colorScheme: light ? 'light' : 'dark',
    deviceScaleFactor: 2,
  })
  // Kapitel 2-5 sind hinter einem ?unlock=CODE-Gate. Der Code muss nicht
  // bekannt sein - die App liest nur dieses localStorage-Flag.
  if (unlock) await ctx.addInitScript(() => localStorage.setItem('istqb_unlock_all', '1'))

  const page = await ctx.newPage()
  const errors = []
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto(url, { waitUntil: 'networkidle' })
  return { page, errors }
}

async function shot(page, name) {
  mkdirSync(outDir, { recursive: true })
  const file = `${outDir}/${name}.png`
  await page.screenshot({ path: file, fullPage: false })
  ok(`Screenshot: ${file}`)
  return file
}

const stopServer = await ensureServer()
const browser = await chromium.launch({ headless: !headed })
let failed = false

try {
  const { page, errors } = await openApp(browser)

  if (cmd === 'shot') {
    const name = argv.filter(a => !a.startsWith('-'))[1] ?? 'home'
    await shot(page, name)
  } else if (cmd === 'smoke') {
    // 1. Startseite
    await page.getByRole('heading', { name: /ISTQB CT-GenAI/ }).waitFor({ timeout: 5000 })
    const chapters = await page.getByRole('button', { name: 'Theorie' }).count()
    if (chapters < 5) throw new Error(`nur ${chapters} Kapitel gerendert, erwartet >= 5`)
    ok(`Startseite gerendert, ${chapters} Kapitel`)
    await shot(page, 'home')

    // 2. Quiz öffnen
    await page.getByRole('button', { name: 'Quiz starten' }).first().click()
    const counter = await page.locator('body').innerText()
    const progress = counter.match(/\d+\/\d+/)?.[0]
    if (!progress) throw new Error('kein Fortschrittszähler (n/m) in der Quiz-View')
    ok(`Quiz geöffnet, Fortschritt ${progress}`)

    // 3. Frage beantworten
    await page.getByRole('button', { name: /^a\)/ }).click()
    await page.getByRole('button', { name: 'Antwort überprüfen' }).click()
    await page.getByRole('button', { name: 'Nächste Frage' }).waitFor({ timeout: 5000 })
    ok('Antwort ausgewertet, Erklärungen sichtbar')
    await shot(page, 'quiz-answered')

    // 4. Persistenz
    const saved = await page.evaluate(() => localStorage.getItem('istqb_progress'))
    if (!saved || !JSON.parse(saved).submittedIds) throw new Error('Fortschritt nicht in localStorage gespeichert')
    ok('Fortschritt in localStorage persistiert')

    // 5. Glossar
    await page.getByRole('button', { name: /zurück/ }).click()
    await page.getByRole('button', { name: /Glossar/ }).click()
    await page.waitForTimeout(300)
    ok('Glossar geöffnet')
    await shot(page, 'glossary')

    if (errors.length) throw new Error(`Console-Errors:\n  ${errors.join('\n  ')}`)
    ok('keine Console-Errors')
    console.log('\n✓ SMOKE PASSED')
  } else {
    die(`unbekanntes Kommando: ${cmd} (erwartet: smoke | shot)`)
  }
} catch (err) {
  failed = true
  console.error(`\n✗ ${err.message}`)
} finally {
  await browser.close()
  stopServer()
}

process.exit(failed ? 1 : 0)
