import { gridClass } from '../lib/categories'

const spans = [
  'col-span-2 row-span-2', 'col-span-2 row-span-2', 'col-span-2 row-span-2',
  'col-span-2', 'col-span-2', 'col-span-1', 'col-span-1', 'col-span-2', 'col-span-1', 'col-span-1',
]

export default function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 border-y-2 border-line py-8">
        <div className="mx-auto h-16 w-2/3 max-w-2xl bg-inset" />
      </div>
      <div className={gridClass}>
        {spans.map((s, i) => (
          <div key={i} className={`${s} border border-line bg-surface`} />
        ))}
      </div>
    </div>
  )
}
