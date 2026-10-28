import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { labelClass } from '../lib/categories'

export default function DigestTile({ headline, digest, onOpen, style }) {
  if (!digest) return null

  return (
    <motion.article
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="group relative flex flex-col bg-fg p-6 text-surface ring-fg ring-offset-2 ring-offset-canvas has-[:focus-visible]:ring-1"
    >
      <p className={`${labelClass} text-surface/60`}>Today in brief</p>
      {headline && (
        <h2 className="mt-3 line-clamp-3 font-serif text-[28px] font-medium leading-[1.1] text-balance md:text-[32px]">
          {headline}
        </h2>
      )}
      <p className="mt-3 line-clamp-7 font-serif text-[16px] leading-relaxed text-surface/75">{digest}</p>
      <button
        type="button"
        onClick={onOpen}
        className={`${labelClass} mt-auto inline-flex items-center gap-1.5 self-start pt-4 outline-none after:absolute after:inset-0 after:content-['']`}
      >
        Read the brief
        <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
      </button>
    </motion.article>
  )
}
