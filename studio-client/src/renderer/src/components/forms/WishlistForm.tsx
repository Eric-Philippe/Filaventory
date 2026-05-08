import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type WishlistItem, type Filament } from '../../api/client'
import FilamentSearchInput from '../FilamentSearchInput'

interface Props { item?: WishlistItem | null; onDone: () => void }

const PRIORITIES = [
  { value: 1, label: 'High' },
  { value: 0, label: 'Normal' },
  { value: -1, label: 'Low' },
]

export default function WishlistForm({ item, onDone }: Props): React.ReactElement {
  const qc = useQueryClient()
  const [filament, setFilament] = useState<Filament | null>(item?.filament ?? null)
  const [form, setForm] = useState({
    quantity: item?.quantity_spools ?? 1,
    desiredPrice: item?.desired_price ?? '',
    purchaseUrl: item?.purchase_url ?? '',
    comment: item?.comment ?? '',
    priority: item?.priority ?? 0,
  })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  // Show detail fields once a filament is selected (new item) or always when editing
  const showDetails = !!item || !!filament

  const save = useMutation({
    mutationFn: () => item
      ? api.wishlist.update(item.id_wish, {
          quantity_spools: Number(form.quantity),
          desired_price: form.desiredPrice ? Number(form.desiredPrice) : undefined,
          purchase_url: form.purchaseUrl || undefined,
          comment: form.comment || undefined,
          priority: Number(form.priority) as 0 | 1 | -1,
        })
      : api.wishlist.create({
          id_filament: filament!.id_filament,
          quantity_spools: Number(form.quantity),
          desired_price: form.desiredPrice ? Number(form.desiredPrice) : undefined,
          purchase_url: form.purchaseUrl || undefined,
          comment: form.comment || undefined,
          priority: Number(form.priority) as 0 | 1 | -1,
        }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); onDone() },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!item && !filament) { setError('Select a filament'); return }
    save.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">{error}</p>}

      {!item && (
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Filament</label>
          <FilamentSearchInput value={filament} onChange={setFilament} />
        </div>
      )}

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Quantity (spools)</label>
                <input type="number" min={0.1} step={0.1} value={form.quantity} onChange={set('quantity')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
              </div>
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Target price</label>
                <input type="number" min={0} step={0.01} value={form.desiredPrice} onChange={set('desiredPrice')}
                  placeholder="Optional"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Purchase link</label>
              <input type="url" value={form.purchaseUrl} onChange={set('purchaseUrl')}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Priority</label>
              <select value={form.priority} onChange={set('priority')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Notes</label>
              <textarea value={form.comment} onChange={set('comment')} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-white/15 text-white/60 hover:text-white/80 text-sm transition-colors">Cancel</button>
        <button type="submit" disabled={save.isPending || (!item && !filament)}
          className="flex-1 py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50">
          {save.isPending ? 'Saving...' : item ? 'Save changes' : 'Add to wishlist'}
        </button>
      </div>
    </form>
  )
}
