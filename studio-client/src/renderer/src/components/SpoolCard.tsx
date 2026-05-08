import { motion } from 'framer-motion'
import { type Spool } from '../api/client'
import WeightBar from './WeightBar'

interface Props {
  spool: Spool
  selected?: boolean
  onClick: () => void
  index?: number
}

export default function SpoolCard({ spool, selected, onClick, index = 0 }: Props): React.ReactElement {
  const f = spool.filament
  const weightPct = f ? Math.round((spool.weight_remaining_grams / f.weight_grams) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onClick={onClick}
      className={`glass rounded-xl p-4 cursor-pointer transition-all duration-150 hover:border-white/20 ${
        selected ? 'border-light-blue/50 bg-light-blue/5' : ''
      }`}
    >
      {/* Image or color swatch + title */}
      <div className="flex items-start gap-3 mb-3">
        {f?.image_url ? (
          <img
            src={f.image_url}
            alt={f.title}
            className="w-10 h-10 rounded-lg border border-white/15 shrink-0 object-cover shadow-lg"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg border border-white/15 shrink-0 shadow-lg"
            style={{ backgroundColor: f?.color_hex ?? '#808080' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm font-medium truncate">{f?.title ?? '—'}</p>
          <p className="text-white/40 text-xs truncate">{f?.brand?.name ?? '—'}</p>
        </div>
      </div>

      {/* Color dot + material badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
            style={{ backgroundColor: f?.color_hex ?? '#808080' }}
          />
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/60">
            {f?.material_type ?? '—'}
          </span>
        </div>
        {spool.rack && (
          <span className="text-xs text-white/30 truncate max-w-20">{spool.rack.name}</span>
        )}
      </div>

      {/* Weight bar */}
      {f && <WeightBar remaining={spool.weight_remaining_grams} total={f.weight_grams} size="sm" />}

      {/* Flags */}
      {(spool.rfid_tag || !spool.is_dry || !spool.is_spooled) && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {spool.rfid_tag && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-deep-purple/60 text-light-blue/80 border border-light-blue/20" title={spool.rfid_tag}>
              RFID
            </span>
          )}
          {!spool.is_dry && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-vibrant-orange/15 text-vibrant-orange/80">Needs drying</span>
          )}
          {!spool.is_spooled && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-vibrant-orange/20 text-vibrant-orange/80">Refill</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
