import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Atom, Bot, BrainCircuit, Cable, Check, Copy, Cpu, FlaskConical, GraduationCap,
  Info, Leaf, Loader2, MapPin, Newspaper, PenLine, RefreshCw, Rocket, Search, Smartphone, Sparkles, Terminal,
} from 'lucide-react'
import { labelClass } from '../lib/categories'

const steps = ['Location', 'Model', 'Sources']
const inputClass =
  'w-full rounded-lg border border-line bg-canvas px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-subtle focus:border-fg'
const primaryButton =
  'inline-flex items-center gap-1.5 rounded-lg bg-fg px-6 py-3 text-[15px] font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-30'
const selectedRing = 'border-fg shadow-[inset_0_0_0_1px_var(--color-fg)]'

const feedIcons = {
  'Hacker News': Terminal,
  TechCrunch: Rocket,
  'The Verge': Smartphone,
  'Ars Technica': Cpu,
  'MIT Technology Review': GraduationCap,
  Wired: Cable,
  'Anthropic News': Sparkles,
  'OpenAI Blog': Bot,
  'Google AI Blog': BrainCircuit,
  'Simon Willison': PenLine,
  'Science Daily': FlaskConical,
  'Nature News': Leaf,
  'Quanta Magazine': Atom,
}

function StepHeader({ title, description }) {
  return (
    <div>
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
    </div>
  )
}

function Label({ children }) {
  return <label className="mb-2 block text-sm font-medium">{children}</label>
}

function LocationStep({ form, update }) {
  const [query, setQuery] = useState(form.city)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || query.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?count=5&name=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => setResults(d.results || []))
        .catch(() => {})
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open])

  function choose(place) {
    update({ city: place.name, country: place.country || form.country })
    setQuery(place.name)
    setOpen(false)
  }

  const showResults = open && query.trim().length >= 2 && results.length > 0

  return (
    <>
      <StepHeader
        title="Where do you wake up?"
        description="We'll print your weather and the biggest local and national stories for this place."
      />
      <div className="mt-8 space-y-5">
        <div className="relative">
          <Label>City</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
                update({ city: e.target.value })
              }}
              onBlur={() => setOpen(false)}
              placeholder="Search for your city"
              className={`${inputClass} pl-11`}
              autoFocus
            />
          </div>
          {showResults && (
            <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-fg bg-surface p-1 shadow-[0_12px_32px_-12px_rgba(27,26,23,0.35)]">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choose(place)
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] hover:bg-inset"
                  >
                    <MapPin className="size-4 shrink-0 text-subtle" />
                    <span className="truncate">
                      {place.name}
                      <span className="text-subtle">
                        {' '}&middot; {[place.admin1, place.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Label>Country</Label>
          <input
            value={form.country}
            onChange={(e) => update({ country: e.target.value })}
            placeholder="Country"
            className={inputClass}
          />
        </div>
      </div>
    </>
  )
}

function formatSize(bytes) {
  return bytes ? `${(bytes / 1e9).toFixed(1)} GB` : null
}

function isRecommended(parameterSize) {
  const value = parseFloat(parameterSize)
  return value >= 2.5 && value <= 5.5
}

function ModelStep({ form, update }) {
  const [state, setState] = useState({ loading: true, ok: false, models: [] })
  const [host, setHost] = useState(form.ollama_host)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/models?host=${encodeURIComponent(form.ollama_host)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setState({ loading: false, ok: d.ok, models: d.models.filter((m) => !/embed/i.test(m.name)) })
      })
      .catch(() => !cancelled && setState({ loading: false, ok: false, models: [] }))
    return () => {
      cancelled = true
    }
  }, [form.ollama_host, attempt])

  function refresh() {
    setState((s) => ({ ...s, loading: true }))
    update({ ollama_host: host.trim() || form.ollama_host })
    setAttempt((n) => n + 1)
  }

  return (
    <>
      <StepHeader
        title="Who edits your paper?"
        description="A small local model reads every candidate story and keeps only the best. Models around 4B are the sweet spot."
      />

      <div className="mt-8">
        {state.loading ? (
          <div className="flex items-center gap-2 py-6 text-muted">
            <Loader2 className="size-4 animate-spin" />
            Looking for installed models&hellip;
          </div>
        ) : state.ok && state.models.length > 0 ? (
          <div className="max-h-72 space-y-2.5 overflow-y-auto p-px">
            {state.models.map((m) => {
              const selected = form.ollama_model === m.name
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => update({ ollama_model: m.name })}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors ${
                    selected ? selectedRing : 'border-line hover:border-fg/50'
                  }`}
                >
                  <Cpu className="size-5 shrink-0 text-muted" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{m.name}</span>
                    <span className="block text-sm text-subtle">
                      {[m.parameter_size, formatSize(m.size)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {isRecommended(m.parameter_size) && (
                    <span className={`${labelClass} shrink-0 text-accent`}>Recommended</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-accent/40 bg-accent-soft/40 p-4 text-[15px]">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>
                {state.ok
                  ? 'Ollama is running but has no models yet. Pull one with `ollama pull qwen3.5:4b`, or type a name below.'
                  : `Couldn't reach Ollama at ${form.ollama_host}. Make sure it's running, or type a model name below.`}
              </p>
            </div>
            <div>
              <Label>Model name</Label>
              <input
                value={form.ollama_model}
                onChange={(e) => update({ ollama_model: e.target.value })}
                placeholder="qwen3.5:4b"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-7">
        <Label>Ollama host</Label>
        <div className="flex gap-2">
          <input value={host} onChange={(e) => setHost(e.target.value)} className={inputClass} />
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh models"
            className="grid size-[50px] shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-fg hover:text-fg"
          >
            <RefreshCw className={`size-4 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </>
  )
}

function SourcesStep({ form, update, catalog }) {
  const groups = [
    ['Technology & AI', catalog.tech_feeds],
    ['Science', catalog.science_feeds],
  ]

  function toggle(urls, on) {
    const next = new Set(form.feeds)
    for (const url of urls) {
      if (on) next.add(url)
      else next.delete(url)
    }
    update({ feeds: next })
  }

  return (
    <>
      <StepHeader
        title="What are you into?"
        description="Pick the sources we read every morning. Local and national news come from your city."
      />

      {groups.map(([label, feeds]) => {
        if (!feeds.length) return null
        const allOn = feeds.every((f) => form.feeds.has(f.url))
        return (
          <div key={label} className="mt-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">{label}</h2>
              <button
                type="button"
                onClick={() => toggle(feeds.map((f) => f.url), !allOn)}
                className="text-[15px] font-medium underline underline-offset-4"
              >
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5 p-px">
              {feeds.map((f) => {
                const on = form.feeds.has(f.url)
                const Icon = feedIcons[f.name] || Newspaper
                return (
                  <button
                    key={f.url}
                    type="button"
                    onClick={() => toggle([f.url], !on)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[15px] transition-colors ${
                      on ? selectedRing : 'border-line hover:border-fg/50'
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.5} />
                    {f.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Stories per issue</h2>
          <span className="text-xl font-light tabular-nums">{form.max_articles}</span>
        </div>
        <input
          type="range"
          min={8}
          max={30}
          value={form.max_articles}
          onChange={(e) => update({ max_articles: Number(e.target.value) })}
          className="w-full accent-fg"
        />
        <p className="mt-2 text-sm text-subtle">More stories means a longer curation run.</p>
      </div>
    </>
  )
}

function Done() {
  const [copied, setCopied] = useState(false)
  const command = 'python3 main.py --now'

  function copy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="py-2">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="grid size-12 place-items-center rounded-full bg-fg text-surface"
      >
        <Check className="size-6" />
      </motion.span>
      <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.02em]">Ready for print</h1>
      <p className="mt-2 text-base text-muted">Settings saved to config.yaml. Go to press each morning with:</p>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas py-2 pr-2 pl-4 font-mono text-sm">
        <span className="truncate">{command}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy command"
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-inset hover:text-fg"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <div className="mt-8 flex justify-end border-t border-line pt-5">
        <Link to="/" className={primaryButton}>
          Read today&rsquo;s paper
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const [status, setStatus] = useState('loading')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(null)
  const [catalog, setCatalog] = useState({ tech_feeds: [], science_feeds: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ config, catalog }) => {
        setCatalog(catalog)
        setForm({
          city: config.city || '',
          country: config.country || '',
          ollama_host: config.ollama_host || 'http://localhost:11434',
          ollama_model: config.ollama_model || '',
          max_articles: config.max_articles || 18,
          feeds: new Set([...(config.tech_feeds || []), ...(config.science_feeds || [])].map((f) => f.url)),
        })
        setStatus('ready')
      })
      .catch(() => setStatus('offline'))
  }, [])

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const { feeds, ...rest } = form
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          tech_feeds: catalog.tech_feeds.filter((f) => feeds.has(f.url)).map((f) => f.url),
          science_feeds: catalog.science_feeds.filter((f) => feeds.has(f.url)).map((f) => f.url),
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Could not save settings')
      setStep(3)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (status === 'offline') {
    return (
      <div className="mx-auto mt-16 max-w-md border border-line bg-surface p-8">
        <p className={`${labelClass} text-accent`}>Settings unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Start the dev server to edit settings</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Setup saves to config.yaml through the local server. Run{' '}
          <code className="rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-sm text-fg">npm run dev</code> in{' '}
          <code className="rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-sm text-fg">web/</code>, or edit
          config.yaml by hand.
        </p>
      </div>
    )
  }

  const allFeeds = catalog.tech_feeds.length + catalog.science_feeds.length
  const status_ = [
    form.city.trim() ? [form.city.trim(), form.country.trim()].filter(Boolean).join(', ') : 'Choose your city',
    form.ollama_model.trim() || 'Choose a model',
    `${form.feeds.size}/${allFeeds} selected`,
  ][step]
  const canContinue = [
    form.city.trim() && form.country.trim(),
    form.ollama_model.trim(),
    form.feeds.size > 0,
  ][step]

  return (
    <div className="mx-auto max-w-xl py-2 md:py-10">
      <div className="border border-line bg-surface p-6 sm:p-9">
        {step < 3 && (
          <div className="mb-9">
            <div className="mb-4 flex h-9 items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                aria-label="Back"
                className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-inset ${step === 0 ? 'invisible' : ''}`}
              >
                <ArrowLeft className="size-5" />
              </button>
              <span className={`${labelClass} text-muted`}>
                Step {step + 1} of {steps.length} &middot; {steps[step]}
              </span>
            </div>
            <div className="flex gap-1.5">
              {steps.map((label, i) => (
                <div key={label} className="h-[3px] flex-1 overflow-hidden bg-inset">
                  <motion.div
                    className="h-full bg-fg"
                    initial={false}
                    animate={{ width: i <= step ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <LocationStep form={form} update={update} />}
            {step === 1 && <ModelStep form={form} update={update} />}
            {step === 2 && <SourcesStep form={form} update={update} catalog={catalog} />}
            {step === 3 && <Done />}
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-5 text-sm text-accent">{error}</p>}

        {step < 3 && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5">
            <span className="min-w-0 truncate text-[15px] font-semibold">{status_}</span>
            <button
              type="button"
              onClick={step === 2 ? save : () => setStep((s) => s + 1)}
              disabled={!canContinue || saving}
              className={primaryButton}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {step === 2 ? 'Save' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
