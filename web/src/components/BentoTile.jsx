import { motion } from 'framer-motion'
import { bylineClass, getCategory, labelClass } from '../lib/categories'

function Label({ article }) {
  return <p className={`${labelClass} text-accent`}>{getCategory(article.category).label}</p>
}

function Byline({ article, className = '' }) {
  return <p className={`${bylineClass} truncate ${className}`}>By {article.source}</p>
}

function Headline({ article, onOpen, className }) {
  return (
    <h3 className={className}>
      <button
        type="button"
        onClick={onOpen}
        className="inline [text-align:inherit] outline-none after:absolute after:inset-0 after:content-['']"
      >
        {article.title}
      </button>
    </h3>
  )
}

function Photo({ src, className }) {
  return (
    <div className={`overflow-hidden bg-inset ${className}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-full object-cover contrast-[1.05] grayscale outline -outline-offset-1 outline-black/10 transition-[filter] duration-500 group-hover:grayscale-0"
        onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
      />
    </div>
  )
}

function High({ article, onOpen }) {
  const image = article.image
  return (
    <div className="flex size-full flex-col p-4">
      {image && <Photo src={image} className="min-h-0 flex-1" />}
      <div className={`flex flex-col items-center text-center ${image ? 'pt-4' : 'flex-1 justify-center px-2'}`}>
        <Label article={article} />
        <Headline
          article={article}
          onOpen={onOpen}
          className={`mt-2 font-serif font-medium leading-[1.1] tracking-[-0.01em] text-balance ${
            image ? 'line-clamp-2 text-[26px] md:text-[30px]' : 'line-clamp-4 text-[32px] md:text-[40px]'
          }`}
        />
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

function Medium({ article, onOpen }) {
  return (
    <div className="flex size-full gap-4 p-3">
      {article.image && <Photo src={article.image} className="w-2/5 shrink-0" />}
      <div className={`flex min-w-0 flex-1 flex-col justify-between py-1 ${article.image ? 'pr-1' : 'px-2'}`}>
        <Label article={article} />
        <div>
          <Headline
            article={article}
            onOpen={onOpen}
            className="line-clamp-3 font-serif text-[20px] font-medium leading-[1.15] text-balance md:text-[22px]"
          />
          <p className="mt-1.5 line-clamp-2 font-serif text-[14px] leading-snug text-muted max-md:hidden">
            {article.summary}
          </p>
        </div>
        <Byline article={article} />
      </div>
    </div>
  )
}

function Low({ article, onOpen }) {
  return (
    <div className="flex size-full flex-col items-center justify-between p-4 text-center">
      <Label article={article} />
      <Headline
        article={article}
        onOpen={onOpen}
        className="line-clamp-4 font-serif text-[18px] font-medium leading-[1.2] text-balance md:text-[19px]"
      />
      <Byline article={article} className="max-w-full" />
    </div>
  )
}

const bodies = { high: High, medium: Medium, low: Low }

export default function BentoTile({ article, index, onOpen, style }) {
  const Body = bodies[article.importance] || Low

  return (
    <motion.article
      layout
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      className="group relative border border-line bg-surface transition-colors duration-150 hover:border-fg has-[:focus-visible]:border-fg has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-fg"
    >
      <Body article={article} onOpen={onOpen} />
    </motion.article>
  )
}
