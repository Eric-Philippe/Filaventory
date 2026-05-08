import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Rack } from '../../api/client'

interface Props { rack?: Rack | null; onDone: () => void }

export default function RackForm({ rack, onDone }: Props): React.ReactElement {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: rack?.name ?? '',
    description: rack?.description ?? '',
    maxCapacity: rack?.max_capacity ?? '',
  })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: () => rack
      ? api.racks.update(rack.id_rack, { name: form.name, description: form.description || undefined, max_capacity: Number(form.maxCapacity) || undefined })
      : api.racks.create({ name: form.name, description: form.description || undefined, max_capacity: Number(form.maxCapacity) || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racks'] }); onDone() },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(''); save.mutate() }} className="space-y-4">
      {error && <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Name</label>
        <input value={form.name} onChange={set('name')} required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
      </div>
      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
      </div>
      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Max capacity (slots)</label>
        <input type="number" min={1} value={form.maxCapacity} onChange={set('maxCapacity')}
          placeholder="Leave blank for unlimited"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-white/15 text-white/60 hover:text-white/80 text-sm transition-colors">Cancel</button>
        <button type="submit" disabled={save.isPending}
          className="flex-1 py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50">
          {save.isPending ? 'Saving...' : rack ? 'Save changes' : 'Create rack'}
        </button>
      </div>
    </form>
  )
}
