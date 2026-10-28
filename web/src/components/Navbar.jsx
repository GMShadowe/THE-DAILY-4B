import { Link, NavLink } from 'react-router-dom'
import { Archive, Newspaper, Settings2 } from 'lucide-react'
import { labelClass } from '../lib/categories'

function linkClass({ isActive }) {
  return `${labelClass} inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
    isActive ? 'text-fg' : 'text-muted hover:text-fg'
  }`
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-sans text-[15px] font-extrabold uppercase tracking-[-0.02em]">
          The Daily 4B
        </Link>
        <nav className="flex items-center">
          <NavLink to="/" end className={linkClass}>
            <Newspaper className="size-3.5" />
            Today
          </NavLink>
          <NavLink to="/archive" className={linkClass}>
            <Archive className="size-3.5" />
            Archive
          </NavLink>
          <NavLink to="/setup" aria-label="Settings" className={linkClass}>
            <Settings2 className="size-3.5" />
            <span className="max-sm:hidden">Settings</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
