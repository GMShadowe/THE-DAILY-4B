import {
  Briefcase, Cpu, FlaskConical, Globe, HeartPulse, Landmark, Leaf, MapPin, Newspaper, Palette, Trophy,
} from 'lucide-react'

export const categories = {
  world: { label: 'World', icon: Globe },
  country: { label: 'National', icon: Landmark },
  local: { label: 'Local', icon: MapPin },
  business: { label: 'Business', icon: Briefcase },
  tech: { label: 'Technology', icon: Cpu },
  science: { label: 'Science', icon: FlaskConical },
  health: { label: 'Health', icon: HeartPulse },
  climate: { label: 'Climate', icon: Leaf },
  culture: { label: 'Culture', icon: Palette },
  sports: { label: 'Sports', icon: Trophy },
}

export function getCategory(key = 'news') {
  return categories[key] || { label: key.charAt(0).toUpperCase() + key.slice(1), icon: Newspaper }
}

export function sortSections(keys) {
  const order = Object.keys(categories)
  const rank = (key) => (order.includes(key) ? order.indexOf(key) : order.length)
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export const gridClass =
  'grid grid-flow-row-dense grid-cols-2 auto-rows-[200px] gap-3 md:grid-cols-4 md:auto-rows-[220px] xl:grid-cols-6 2xl:grid-cols-8'

export const labelClass = 'font-sans text-[10.5px] font-semibold uppercase tracking-[0.12em]'
export const bylineClass = 'font-sans text-[9.5px] font-medium uppercase tracking-[0.1em] text-subtle'
