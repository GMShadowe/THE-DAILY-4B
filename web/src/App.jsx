import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Archive from './pages/Archive'
import ArchiveIssue from './pages/ArchiveIssue'
import Onboarding from './pages/Onboarding'

function titleFor(pathname) {
  if (pathname === '/archive') return 'Archive · The Daily 4B'
  if (pathname === '/setup') return 'Settings · The Daily 4B'
  if (pathname.startsWith('/archive/')) {
    const date = new Date(`${pathname.slice('/archive/'.length)}T00:00:00`)
    const label = Number.isNaN(date.getTime()) ? 'Archive' : date.toLocaleDateString('en-US', { dateStyle: 'long' })
    return `${label} · The Daily 4B`
  }
  return 'The Daily 4B'
}

function Shell() {
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    document.title = titleFor(pathname)
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main ref={mainRef} id="main" tabIndex={-1} className="flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/archive/:date" element={<ArchiveIssue />} />
          <Route path="/setup" element={<Onboarding />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </BrowserRouter>
  )
}
