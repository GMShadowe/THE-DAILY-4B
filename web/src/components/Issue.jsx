import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import BentoTile from './BentoTile'
import WeatherTile from './WeatherTile'
import DigestTile from './DigestTile'
import DetailModal from './DetailModal'
import { categories, gridClass, labelClass } from '../lib/categories'
import { pack, placement, tileSize, useColumns } from '../lib/grid'

function interleave(list) {
  const groups = { high: [], medium: [], low: [] }
  for (const article of list) (groups[article.importance] || groups.low).push(article)
  return Object.values(groups)
    .flatMap((group) => group.map((article, i) => ({ article, pos: (i + 0.5) / group.length })))
    .sort((a, b) => a.pos - b.pos)
    .map(({ article }) => article)
}

function dateParts(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const start = new Date(d.getFullYear(), 0, 1)
  return {
    number: Math.floor((d - start) / 86400000) + 1,
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    long: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

function Masthead({ issue, count, archived }) {
  const { number, weekday, long } = dateParts(issue.date)
  const weather = issue.weather

  return (
    <header className="border-t-2 border-fg">
      <div className="grid items-center gap-4 border-b border-fg py-5 md:grid-cols-[1fr_auto_1fr] md:py-7">
        <div className={`${labelClass} space-y-1 text-muted max-md:hidden`}>
          <p className="text-fg">No. {number}</p>
          <p>{weekday}</p>
          <p>{long}</p>
        </div>
        <h1 className="text-center font-sans text-[clamp(44px,9vw,132px)] font-extrabold uppercase leading-[0.85] tracking-[-0.045em]">
          The Daily 4B
        </h1>
        <div className={`${labelClass} space-y-1 text-right text-muted max-md:hidden`}>
          <p className="text-fg">{issue.city}</p>
          <p>{issue.country}</p>
          <p>{weather ? `${Math.round(weather.temperature)}° · ${weather.condition}` : `${count} stories`}</p>
        </div>
        <p className={`${labelClass} text-center text-muted md:hidden`}>
          No. {number} &middot; {weekday}, {long}
        </p>
      </div>
      <p className="border-b border-line py-2.5 text-center font-serif text-[15px] italic text-muted">
        {archived ? `From the archive · ${count} stories` : 'All the news a 4B model sees fit to print'}
      </p>
    </header>
  )
}

export default function Issue({ issue, archived = false }) {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const articles = useMemo(() => interleave(issue.articles || []), [issue])

  const counts = useMemo(() => {
    const result = {}
    for (const a of articles) result[a.category] = (result[a.category] || 0) + 1
    return result
  }, [articles])

  const sections = [
    ['all', 'All stories', articles.length],
    ...Object.entries(categories).filter(([key]) => counts[key]).map(([key, meta]) => [key, meta.label, counts[key]]),
  ]
  const visible = useMemo(
    () => (filter === 'all' ? articles : articles.filter((a) => a.category === filter)),
    [articles, filter],
  )
  const columns = useColumns()
  const placed = useMemo(
    () => pack(
      [
        ...(issue.weather ? [{ key: 'weather', width: 2, height: 2 }] : []),
        ...(issue.digest ? [{ key: 'digest', width: 2, height: 2 }] : []),
        ...visible.map((article) => ({ key: article.link || article.title, article, ...tileSize(article.importance) })),
      ],
      columns,
    ),
    [issue.weather, issue.digest, visible, columns],
  )

  return (
    <>
      <Masthead issue={issue} count={articles.length} archived={archived} />

      <nav aria-label="Sections" className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max justify-start gap-7 md:justify-center">
          {sections.map(([key, label, count]) => {
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(key)}
                className={`${labelClass} relative py-3 transition-colors ${active ? 'text-fg' : 'text-muted hover:text-fg'}`}
              >
                {label}
                <sup className="ml-1 text-[9px] text-subtle tabular-nums">{count}</sup>
                {active && (
                  <motion.span
                    layoutId="section-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <LayoutGroup>
        <div className={gridClass}>
          <AnimatePresence mode="popLayout">
            {placed.map((item, i) => {
              const style = placement(item)
              if (item.key === 'weather') return <WeatherTile key="weather" weather={issue.weather} style={style} />
              if (item.key === 'digest') {
                return (
                  <DigestTile
                    key="digest"
                    headline={issue.headline}
                    digest={issue.digest}
                    style={style}
                    onOpen={() => setSelected({ kind: 'digest' })}
                  />
                )
              }
              return (
                <BentoTile
                  key={item.key}
                  article={item.article}
                  index={i}
                  style={style}
                  onOpen={() => setSelected({ kind: 'article', article: item.article })}
                />
              )
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      <footer className={`${labelClass} mt-10 flex flex-col items-center gap-1 border-t border-fg pt-3 text-subtle sm:flex-row sm:justify-between`}>
        <span>Curated locally{issue.model ? ` by ${issue.model}` : ''}</span>
        {issue.generated_at && (
          <span>
            Printed {new Date(issue.generated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </footer>

      <AnimatePresence>
        {selected && <DetailModal item={selected} issue={issue} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  )
}
