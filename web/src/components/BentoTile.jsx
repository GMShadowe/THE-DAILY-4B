import { motion } from 'framer-motion'
import { bylineClass, getCategory, labelClass } from '../lib/categories'

const span = {
  high: 'col-span-2 row-span-2',
  medium: 'col-span-2',
  low: 'col-span-1',
}

function Label({ article }) {
  return <p className={`${labelClass} text-accent`}>{getCategory(article.category).label}</p>
}

function Byline({ article, className = '' }) {
  return <p className={`${bylineClass} truncate ${className}`}>By {article.source}</p>
}

function Photo({ src, className }) {
  return (
    <div className={`overflow-hidden bg-inset ${className}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-full object-cover contrast-[1.05] grayscale transition duration-500 group-hover:grayscale-0"
        onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
      />
    </div>
  )
}

function High({ article }) {
  const image = article.image
  return (
    <div className="flex size-full flex-col p-4">
      {image && <Photo src={image} className="min-h-0 flex-1" />}
      <div className={`flex flex-col items-center text-center ${image ? 'pt-4' : 'flex-1 justify-center px-2'}`}>
        <Label article={article} />
        <h3
          className={`mt-2 font-serif font-medium leading-[1.1] tracking-[-0.01em] text-balance ${
            image ? 'line-clamp-2 text-[26px] md:text-[30px]' : 'line-clamp-4 text-[32px] md:text-[40px]'
          }`}
        >
          {article.title}
        </h3>
        <p
          className={`mt-2 font-serif leading-snug text-muted ${
            image ? 'line-clamp-2 text-[15px]' : 'line-clamp-4 max-w-md text-[17px]'
          }`}
        >
          {article.summary}
        </p>
        <Byline article={article} className="mt-3 max-w-full" />
      </div>
    </div>
  )
}

function Medium({ article }) {
  return (
    <div className="flex size-full gap-4 p-3">
      {article.image && <Photo src={article.image} className="w-2/5 shrink-0" />}
      <div className={`flex min-w-0 flex-1 flex-col justify-between py-1 ${article.image ? 'pr-1' : 'px-2'}`}>
        <Label article={article} />
        <div>
          <h3 className="line-clamp-3 font-serif text-[20px] font-medium leading-[1.15] text-balance md:text-[22px]">
            {article.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 font-serif text-[14px] leading-snug text-muted max-md:hidden">
            {article.summary}
          </p>
        </div>
        <Byline article={article} />
      </div>
    </div>
  )
}

function Low({ article }) {
  return (
    <div className="flex size-full flex-col items-center justify-between p-4 text-center">
      <Label article={article} />
      <h3 className="line-clamp-4 font-serif text-[18px] font-medium leading-[1.2] text-balance md:text-[19px]">
        {article.title}
      </h3>
      <Byline article={article} className="max-w-full" />
    </div>
  )
}

const bodies = { high: High, medium: Medium, low: Low }

export default function BentoTile({ article, index, onOpen }) {
  const importance = bodies[article.importance] ? article.importance : 'low'
  const Body = bodies[importance]

  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      className={`group border border-line bg-surface text-left outline-none transition-colors duration-200 hover:border-fg focus-visible:border-fg focus-visible:ring-1 focus-visible:ring-fg ${span[importance]}`}
    >
      <Body article={article} />
    </motion.button>
  )
}
