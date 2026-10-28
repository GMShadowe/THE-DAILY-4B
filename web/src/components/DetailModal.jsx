import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { bylineClass, getCategory, labelClass } from '../lib/categories'

export default function DetailModal({ item, issue, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const isDigest = item.kind === 'digest'
  const article = item.article

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-fg/40"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
        className="relative max-h-[90svh] w-full max-w-2xl overflow-y-auto border border-fg bg-surface p-3 shadow-[0_24px_60px_-20px_rgba(27,26,23,0.45)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 z-10 grid size-9 place-items-center border border-fg bg-surface text-fg transition-colors hover:bg-fg hover:text-surface"
        >
          <X className="size-4" />
        </button>

        {!isDigest && article.image && (
          <img
            src={article.image}
            alt=""
            referrerPolicy="no-referrer"
            className="aspect-video w-full bg-inset object-cover contrast-[1.05] grayscale"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}

        <div className="px-4 pt-6 pb-5 sm:px-6">
          <p className={`${labelClass} pr-12 text-accent`}>
            {isDigest ? 'Today in brief' : getCategory(article.category).label}
          </p>

          <h2 className="mt-3 font-serif text-[30px] font-medium leading-[1.1] tracking-[-0.01em] text-balance sm:text-[36px]">
            {isDigest ? issue.headline || 'Today in brief' : article.title}
          </h2>

          {!isDigest && <p className={`${bylineClass} mt-3`}>By {article.source}</p>}

          <p className="mt-5 border-t border-line pt-5 font-serif text-[19px] leading-relaxed text-fg/85">
            {isDigest ? issue.digest : article.summary}
          </p>

          {!isDigest && article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-fg px-5 py-3 text-sm font-semibold text-surface transition-opacity hover:opacity-90"
            >
              Read the full story at {article.source}
              <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>
      </motion.div>
    </div>
  )
}
