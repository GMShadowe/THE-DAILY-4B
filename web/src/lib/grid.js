import { useEffect, useState } from 'react'

const breakpoints = [
  ['(min-width: 96rem)', 8],
  ['(min-width: 80rem)', 6],
  ['(min-width: 48rem)', 4],
]

function currentColumns() {
  return breakpoints.find(([query]) => window.matchMedia(query).matches)?.[1] ?? 2
}

export function useColumns() {
  const [columns, setColumns] = useState(currentColumns)
  useEffect(() => {
    const lists = breakpoints.map(([query]) => window.matchMedia(query))
    const update = () => setColumns(currentColumns())
    for (const list of lists) list.addEventListener('change', update)
    return () => {
      for (const list of lists) list.removeEventListener('change', update)
    }
  }, [])
  return columns
}

export function pack(items, columns) {
  const taken = []
  const free = (row, column, width, height) => {
    if (column + width > columns) return false
    for (let y = row; y < row + height; y++) {
      for (let x = column; x < column + width; x++) if (taken[y]?.[x]) return false
    }
    return true
  }
  const claim = (row, column, width, height) => {
    for (let y = row; y < row + height; y++) {
      taken[y] ??= []
      for (let x = column; x < column + width; x++) taken[y][x] = true
    }
  }
  const placed = items.map((item) => {
    const width = Math.min(item.width, columns)
    for (let row = 0; ; row++) {
      for (let column = 0; column < columns; column++) {
        if (free(row, column, width, item.height)) {
          claim(row, column, width, item.height)
          return { ...item, row, column, width }
        }
      }
    }
  })
  return placed.sort((a, b) => a.row - b.row || a.column - b.column)
}

export function placement({ row, column, width, height }) {
  return { gridRow: `${row + 1} / span ${height}`, gridColumn: `${column + 1} / span ${width}` }
}

export function tileSize(importance) {
  if (importance === 'high') return { width: 2, height: 2 }
  if (importance === 'medium') return { width: 2, height: 1 }
  return { width: 1, height: 1 }
}
