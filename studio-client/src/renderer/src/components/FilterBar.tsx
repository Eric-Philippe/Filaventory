import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export type ViewMode = 'list' | 'grid' | 'rack'
export type SortKey = 'default' | 'weight' | 'brand' | 'type' | 'created_at'

export interface Filters {
  q: string
  material: string
  rack_id: string
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',    label: 'Default'    },
  { value: 'weight',     label: 'Weight left' },
  { value: 'brand',      label: 'Brand'      },
  { value: 'type',       label: 'Type'       },
  { value: 'created_at', label: 'Created at' },
]

interface Props {
  filters: Filters
  onFilters: (f: Filters) => void
  view: ViewMode
  onView: (v: ViewMode) => void
  onAdd: () => void
  sort: SortKey
  onSort: (s: SortKey) => void
}

export default function FilterBar({ filters, onFilters, view, onView, onAdd, sort, onSort }: Props): React.ReactElement {
  const [localQ, setLocalQ] = useState(filters.q)
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.filaments.materials(),
    staleTime: 60_000,
  })
  const { data: racks = [] } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.racks.list(),
    staleTime: 30_000,
  })

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onFilters({ ...filters, q: localQ }), 300)
  }, [localQ])

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onFilters({ ...filters, [k]: e.target.value })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Search filaments..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all"
        />
      </div>

      {/* Material */}
      <select
        value={filters.material}
        onChange={set('material')}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-light-blue/50 transition-all"
      >
        <option value="">All materials</option>
        {materials.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Rack */}
      <select
        value={filters.rack_id}
        onChange={set('rack_id')}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-light-blue/50 transition-all"
      >
        <option value="">All racks</option>
        <option value="none">Unassigned</option>
        {racks.map((r) => (
          <option key={r.id_rack} value={String(r.id_rack)}>{r.name}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-light-blue/50 transition-all"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* View toggle */}
      <div className="flex border border-white/10 rounded-lg overflow-hidden">
        {(['list', 'grid', 'rack'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              view === v
                ? 'bg-dark-teal/60 text-light-blue'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Add spool */}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-vibrant-orange hover:bg-vibrant-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Add spool
      </button>
    </div>
  )
}
