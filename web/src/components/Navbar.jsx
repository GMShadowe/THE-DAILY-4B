import { Link, NavLink } from 'react-router-dom'
import { Archive, Newspaper, Settings2 } from 'lucide-react'
import { labelClass } from '../lib/categories'

function linkClass({ isActive }) {
  return `${labelClass} inline-flex min-h-8 items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
    isActive ? 'text-fg' : 'text-muted hover:text-fg'
  }`
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <a
        href="#main"
        className={`${labelClass} absolute top-2 left-4 -translate-y-16 bg-fg px-3 py-2 text-surface focus:translate-y-0`}
      >
        Skip to content
      </a>
      <div className="flex h-12 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-sans text-[15px] font-extrabold whitespace-nowrap uppercase tracking-[-0.02em]">
          The Daily 4B
        </Link>
        <nav aria-label="Primary" className="flex items-center">
          <NavLink to="/" end className={linkClass}>
            <Newspaper className="size-3.5" />
            <span className="max-[400px]:sr-only">Today</span>
          </NavLink>
          <NavLink to="/archive" className={linkClass}>
            <Archive className="size-3.5" />
            <span className="max-[400px]:sr-only">Archive</span>
          </NavLink>
          <NavLink to="/setup" className={linkClass}>
            <Settings2 className="size-3.5" />
            <span className="max-sm:sr-only">Settings</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
