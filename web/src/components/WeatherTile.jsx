import { createElement } from 'react'
import { motion } from 'framer-motion'
import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer,
} from 'lucide-react'
import { labelClass } from '../lib/categories'

function iconFor(code) {
  if (code === 0 || code === 1) return Sun
  if (code === 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 55) return CloudDrizzle
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return CloudRain
  if (code >= 71 && code <= 75) return CloudSnow
  if (code >= 95) return CloudLightning
  return Thermometer
}

export default function WeatherTile({ weather, style }) {
  if (!weather) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={style}
      className="border border-line bg-surface p-3"
    >
      <div className="flex size-full flex-col border border-accent p-5 text-center">
        <p className={`${labelClass} text-accent`}>Weather &middot; {weather.city}</p>
        <div className="flex flex-1 flex-col items-center justify-center">
          {createElement(iconFor(weather.code), { className: 'size-9 text-accent', strokeWidth: 1.25 })}
          <p className="mt-1 font-sans text-[96px] font-light leading-none tracking-[-0.05em] text-accent tabular-nums md:text-[120px]">
            {Math.round(weather.temperature)}&deg;
          </p>
          <p className="mt-2 font-serif text-lg italic text-muted">{weather.condition}</p>
        </div>
        <div className={`${labelClass} grid grid-cols-2 border-t border-accent/40 pt-3 text-subtle`}>
          <span>High {Math.round(weather.high)}&deg;</span>
          <span>Low {Math.round(weather.low)}&deg;</span>
        </div>
      </div>
    </motion.div>
  )
}
