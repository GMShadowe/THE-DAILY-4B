import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { parse, stringify } from 'yaml'

const configPath = fileURLToPath(new URL('../config.yaml', import.meta.url))
const examplePath = fileURLToPath(new URL('../config.example.yaml', import.meta.url))
const dataDir = fileURLToPath(new URL('../data/', import.meta.url))
const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const defaultHost = 'http://localhost:11434'
const defaultApiBase = 'https://api.openai.com/v1'
const keyLine = /^DAILY4B_API_KEY=.*$/m

function readEnv() {
  return fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
}

function hasApiKey() {
  return Boolean(process.env.DAILY4B_API_KEY) || /^DAILY4B_API_KEY=\S+/m.test(readEnv())
}

function saveApiKey(key) {
  const line = `DAILY4B_API_KEY=${key.replace(/\s/g, '')}`
  const text = readEnv()
  const next = keyLine.test(text) ? text.replace(keyLine, () => line) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`
  fs.writeFileSync(envPath, next)
  fs.chmodSync(envPath, 0o600)
}

function readYaml(file) {
  return fs.existsSync(file) ? parse(fs.readFileSync(file, 'utf8')) || {} : null
}

function uniqueFeeds(...lists) {
  const seen = new Set()
  return lists.flat().filter((f) => f?.url && !seen.has(f.url) && seen.add(f.url))
}

function cleanString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : fallback
}

function cleanHost(value, fallback) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : fallback
  } catch {
    return fallback
  }
}

function cleanUrl(value, fallback) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href.replace(/\/$/, '') : fallback
  } catch {
    return fallback
  }
}

function oneOf(value, options, fallback) {
  return options.includes(value) ? value : fallback
}

function cleanFeed(feed) {
  const name = cleanString(feed?.name, null)
  const url = cleanUrl(feed?.url, null)
  return name && url ? { name: name.slice(0, 60), url } : null
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
}

async function checkFeed(value) {
  const url = cleanUrl(value, null)
  if (!url) return { ok: false, error: 'Enter an http or https URL.' }
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Daily4B/0.1 (self-hosted morning paper)' },
      signal: AbortSignal.timeout(8000),
    })
    const text = (await r.text()).slice(0, 1_000_000)
    if (!r.ok || !/<(rss|feed|rdf:RDF)[\s>]/i.test(text)) return { ok: false, error: "That URL isn't an RSS or Atom feed." }
    const title = text.match(/<title[^>]*>\s*(?:<!\[CDATA\[)?\s*([^<]*?)\s*(?:\]\]>)?\s*<\/title>/i)?.[1]
    return { ok: true, url, name: decodeEntities(title || '').slice(0, 60) || new URL(url).hostname }
  } catch {
    return { ok: false, error: "Couldn't load that URL." }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 100_000) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function handle(req, res) {
  const example = readYaml(examplePath) || {}
  const current = readYaml(configPath)
  const base = current || example
  const catalog = {
    tech_feeds: uniqueFeeds(example.tech_feeds || [], base.tech_feeds || []),
    science_feeds: uniqueFeeds(example.science_feeds || [], base.science_feeds || []),
  }
  const { pathname, searchParams } = new URL(req.url, 'http://localhost')

  if (pathname === '/api/config' && req.method === 'GET') {
    return send(res, 200, { exists: Boolean(current), config: base, catalog, api_key_set: hasApiKey() })
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    const body = await readBody(req)
    const pick = (list, urls) => list.filter((f) => Array.isArray(urls) && urls.includes(f.url))
    const custom = Array.isArray(body.custom_feeds) ? body.custom_feeds.slice(0, 50) : []
    const added = (group) => custom.filter((f) => f?.group === group).map(cleanFeed).filter(Boolean)
    const next = {
      city: cleanString(body.city, base.city),
      country: cleanString(body.country, base.country),
      units: oneOf(body.units, ['celsius', 'fahrenheit'], base.units || 'celsius'),
      provider: oneOf(body.provider, ['ollama', 'openai'], base.provider || 'ollama'),
      ollama_host: cleanHost(body.ollama_host, base.ollama_host || defaultHost),
      ollama_model: cleanString(body.ollama_model, base.ollama_model),
      api_base_url: cleanUrl(body.api_base_url, base.api_base_url || defaultApiBase),
      api_model: typeof body.api_model === 'string' ? body.api_model.trim().slice(0, 200) : base.api_model || '',
      max_articles: Math.min(30, Math.max(6, parseInt(body.max_articles, 10) || base.max_articles || 18)),
      tech_feeds: uniqueFeeds(pick(catalog.tech_feeds, body.tech_feeds), added('tech')),
      science_feeds: uniqueFeeds(pick(catalog.science_feeds, body.science_feeds), added('science')),
    }
    for (const [key, value] of Object.entries(base)) if (!(key in next)) next[key] = value
    if (typeof body.api_key === 'string' && body.api_key.trim()) saveApiKey(body.api_key.slice(0, 500))
    fs.writeFileSync(configPath, stringify(next))
    return send(res, 200, { ok: true, config: next, api_key_set: hasApiKey() })
  }

  if (pathname === '/api/feed-check' && req.method === 'POST') {
    const body = await readBody(req)
    return send(res, 200, await checkFeed(body.url))
  }

  if (pathname === '/api/models' && req.method === 'GET') {
    const host = cleanHost(searchParams.get('host'), base.ollama_host || defaultHost)
    try {
      const r = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) })
      const data = await r.json()
      const models = (data.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        parameter_size: m.details?.parameter_size,
      }))
      return send(res, 200, { ok: true, models })
    } catch {
      return send(res, 200, { ok: false, models: [] })
    }
  }

  return send(res, 404, { error: 'Not found' })
}

const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

function rejection(req) {
  if (!loopback.includes(req.socket.remoteAddress)) return 'Settings can only be changed on the machine running the server.'
  if (req.method === 'GET') return null
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return 'Expected JSON.'
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return 'Cross-site requests are not allowed.'
  return null
}

function configApi() {
  const middleware = (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next()
    const reason = rejection(req)
    if (reason) return send(res, 403, { error: reason })
    handle(req, res).catch((e) => send(res, 400, { error: e.message }))
  }
  return {
    name: 'config-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

function serveData(req, res, next) {
  const { pathname } = new URL(req.url, 'http://localhost')
  if (!pathname.startsWith('/data/')) return next()
  const file = path.resolve(dataDir, decodeURIComponent(pathname.slice('/data/'.length)))
  if (!file.startsWith(dataDir) || !file.endsWith('.json') || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
    return send(res, 404, { error: 'Not found' })
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  fs.createReadStream(file).pipe(res)
}

function issueData() {
  return {
    name: 'issue-data',
    configureServer(server) {
      server.middlewares.use(serveData)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveData)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), issueData(), configApi()],
})
