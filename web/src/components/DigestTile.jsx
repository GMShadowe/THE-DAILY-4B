import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { labelClass } from '../lib/categories'

export default function DigestTile({ headline, digest, onOpen }) {
  if (!digest) return null

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="group col-span-2 row-span-2 flex flex-col bg-fg p-6 text-left text-surface outline-none ring-fg ring-offset-2 ring-offset-canvas focus-visible:ring-1"
    >
      <p className={`${labelClass} text-surface/60`}>Today in brief</p>
      {headline && (
        <h2 className="mt-3 line-clamp-3 font-serif text-[28px] font-medium leading-[1.1] text-balance md:text-[32px]">
          {headline}
        </h2>
      )}
      <p className="mt-3 line-clamp-7 font-serif text-[16px] leading-relaxed text-surface/75">{digest}</p>
      <span className={`${labelClass} mt-auto inline-flex items-center gap-1.5 pt-4`}>
        Read the brief
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  )
}
