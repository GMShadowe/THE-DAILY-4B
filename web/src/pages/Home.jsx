import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Newspaper, Settings2, Terminal } from 'lucide-react'
import Issue from '../components/Issue'
import Skeleton from '../components/Skeleton'

export default function Home() {
  const [issue, setIssue] = useState(null)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => d.exists === false && navigate('/setup', { replace: true }))
      .catch(() => {})
  }, [navigate])

  useEffect(() => {
    fetch(`/data/latest.json?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error('no issue yet')
        return r.json()
      })
      .then(setIssue)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-md border border-line bg-surface p-8 text-center">
        <Newspaper className="mx-auto size-7 text-accent" strokeWidth={1.5} />
        <h1 className="mt-4 font-serif text-3xl font-medium">Today&rsquo;s paper isn&rsquo;t printed yet</h1>
        <p className="mt-2 font-serif text-muted">Run this to go to press:</p>
        <code className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-canvas px-4 py-2.5 font-mono text-sm">
          <Terminal className="size-4 text-subtle" />
          python3 main.py --now
        </code>
        <Link
          to="/setup"
          className="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted underline underline-offset-4 transition-colors hover:text-fg"
        >
          <Settings2 className="size-4" />
          Change settings first
        </Link>
      </div>
    )
  }

  if (!issue) return <Skeleton />

  return <Issue issue={issue} />
}
