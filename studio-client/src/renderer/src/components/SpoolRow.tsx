import { motion } from 'framer-motion'
import { type Spool } from '../api/client'
import WeightBar from './WeightBar'

interface Props {
  spool: Spool
  selected?: boolean
  onClick: () => void
  index?: number
}

export default function SpoolRow({ spool, selected, onClick, index = 0 }: Props): React.ReactElement {
  const f = spool.filament

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/5 border ${
        selected ? 'border-light-blue/30 bg-light-blue/5' : 'border-transparent'
      }`}
    >
      {/* Image or color swatch */}
      {f?.image_url ? (
        <img
          src={f.image_url}
          alt={f.title}
          className="w-8 h-8 rounded-md border border-white/15 shrink-0 object-cover"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-md border border-white/15 shrink-0"
          style={{ backgroundColor: f?.color_hex ?? '#808080' }}
        />
      )}

      {/* Name & brand */}
      <div className="w-48 min-w-0">
        <p className="text-white/90 text-sm font-medium truncate">{f?.title ?? '—'}</p>
        <p className="text-white/40 text-xs truncate">{f?.brand?.name ?? '—'}</p>
      </div>

      {/* Material */}
      <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/60 w-20 text-center shrink-0">
        {f?.material_type ?? '—'}
      </span>

      {/* Weight bar */}
      <div className="flex-1">
        {f && <WeightBar remaining={spool.weight_remaining_grams} total={f.weight_grams} size="sm" />}
      </div>

      {/* Rack */}
      <span className="text-xs text-white/30 w-24 text-right shrink-0 truncate">
        {spool.rack?.name ?? 'Unassigned'}
      </span>

      {/* Flags */}
      <div className="flex gap-1 w-24 justify-end shrink-0">
        {spool.rfid_tag && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-deep-purple/60 text-light-blue/80 border border-light-blue/20" title={spool.rfid_tag}>RFID</span>
        )}
        {!spool.is_dry && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-vibrant-orange/15 text-vibrant-orange/80">Dry!</span>
        )}
        {!spool.is_spooled && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-vibrant-orange/20 text-vibrant-orange/80">Bulk</span>
        )}
      </div>
    </motion.div>
  )
}
