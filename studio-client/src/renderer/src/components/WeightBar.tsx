interface Props {
  remaining: number
  total: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function WeightBar({ remaining, total, showLabel = true, size = 'sm' }: Props): React.ReactElement {
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100))
  const color =
    pct > 50 ? 'bg-light-blue' : pct > 20 ? 'bg-vibrant-orange' : 'bg-red-400'

  return (
    <div className="space-y-1">
      <div className={`w-full bg-white/8 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-white/40 text-xs">
          {remaining.toFixed(0)}g / {total}g &nbsp;&middot;&nbsp; {pct.toFixed(0)}%
        </p>
      )}
    </div>
  )
}
