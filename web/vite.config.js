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
const defaultHost = 'http://localhost:11434'

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
    return send(res, 200, { exists: Boolean(current), config: base, catalog })
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    const body = await readBody(req)
    const pick = (list, urls) => list.filter((f) => Array.isArray(urls) && urls.includes(f.url))
    const next = {
      ...base,
      city: cleanString(body.city, base.city),
      country: cleanString(body.country, base.country),
      ollama_host: cleanHost(body.ollama_host, base.ollama_host || defaultHost),
      ollama_model: cleanString(body.ollama_model, base.ollama_model),
      max_articles: Math.min(30, Math.max(6, parseInt(body.max_articles, 10) || base.max_articles || 18)),
      tech_feeds: pick(catalog.tech_feeds, body.tech_feeds),
      science_feeds: pick(catalog.science_feeds, body.science_feeds),
    }
    fs.writeFileSync(configPath, stringify(next))
    return send(res, 200, { ok: true, config: next })
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

function configApi() {
  const middleware = (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next()
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
