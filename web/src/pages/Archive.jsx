import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { labelClass } from '../lib/categories'

function parts(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

export default function Archive() {
  const [dates, setDates] = useState(null)

  useEffect(() => {
    fetch('/data/archive/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setDates)
      .catch(() => setDates([]))
  }, [])

  return (
    <>
      <header className="mb-8 border-t-2 border-fg">
        <h1 className="border-b border-fg py-6 text-center font-sans text-[clamp(44px,8vw,112px)] font-extrabold uppercase leading-[0.85] tracking-[-0.045em]">
          Archive
        </h1>
        <p className="border-b border-line py-2.5 text-center font-serif text-[15px] italic text-muted">
          Every past edition, kept on file
        </p>
      </header>

      {dates && dates.length === 0 && (
        <div className="mx-auto mt-8 max-w-md border border-line bg-surface p-8 text-center">
          <p className={`${labelClass} text-accent`}>Nothing filed yet</p>
          <h2 className="mt-3 font-serif text-2xl font-medium">No past issues</h2>
          <p className="mt-2 font-serif text-muted">Each issue moves here when the next day&rsquo;s paper is printed.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {(dates || []).slice().reverse().map((date, i) => {
          const { weekday, day, month } = parts(date)
          return (
            <motion.div
              key={date}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                to={`/archive/${date}`}
                className="flex h-48 flex-col items-center justify-between border border-line bg-surface p-4 text-center transition-colors hover:border-fg"
              >
                <p className={`${labelClass} text-accent`}>{weekday}</p>
                <p className="font-sans text-[72px] font-light leading-none tracking-[-0.05em]">{day}</p>
                <p className={`${labelClass} text-subtle`}>{month}</p>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
