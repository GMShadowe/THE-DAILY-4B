import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Issue from '../components/Issue'
import Skeleton from '../components/Skeleton'

export default function ArchiveIssue() {
  const { date } = useParams()
  const [issue, setIssue] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    fetch(`/data/archive/${date}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setIssue)
      .catch(() => setMissing(true))
  }, [date])

  return (
    <>
      <Link
        to="/archive"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Archive
      </Link>
      {missing ? (
        <p className="mt-16 text-center text-muted">Issue not found.</p>
      ) : issue ? (
        <Issue issue={issue} archived />
      ) : (
        <Skeleton />
      )}
    </>
  )
}
