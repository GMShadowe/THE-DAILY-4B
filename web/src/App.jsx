import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Archive from './pages/Archive'
import ArchiveIssue from './pages/ArchiveIssue'
import Onboarding from './pages/Onboarding'

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-svh flex-col">
          <Navbar />
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/archive/:date" element={<ArchiveIssue />} />
              <Route path="/setup" element={<Onboarding />} />
            </Routes>
          </main>
        </div>
      </MotionConfig>
    </BrowserRouter>
  )
}
