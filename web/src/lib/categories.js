import { Cpu, FlaskConical, Landmark, MapPin, Newspaper } from 'lucide-react'

export const categories = {
  tech: { label: 'Technology', icon: Cpu },
  science: { label: 'Science', icon: FlaskConical },
  local: { label: 'Local', icon: MapPin },
  country: { label: 'National', icon: Landmark },
}

const fallback = { label: 'News', icon: Newspaper }

export function getCategory(key) {
  return categories[key] || fallback
}

export const gridClass =
  'grid grid-flow-row-dense grid-cols-2 auto-rows-[200px] gap-3 md:grid-cols-4 md:auto-rows-[220px] xl:grid-cols-6 2xl:grid-cols-8'

export const labelClass = 'font-sans text-[10.5px] font-semibold uppercase tracking-[0.12em]'
export const bylineClass = 'font-sans text-[9.5px] font-medium uppercase tracking-[0.1em] text-subtle'
