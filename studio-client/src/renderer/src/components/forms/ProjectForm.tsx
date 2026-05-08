import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Project } from '../../api/client'

interface Props { project?: Project | null; onDone: () => void }

export default function ProjectForm({ project, onDone }: Props): React.ReactElement {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: project?.title ?? '',
    targetPerson: project?.target_person ?? '',
    modelUrl: project?.model_url ?? '',
    comment: project?.comment ?? '',
    tagIds: project?.tags.map((t) => t.id_tag) ?? [] as number[],
  })
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')
  const [showRecipientSuggestions, setShowRecipientSuggestions] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  // Unique recipients from existing projects
  const recipients = [...new Set(
    projects
      .map((p) => p.target_person)
      .filter((r): r is string => !!r && r !== form.targetPerson)
  )].slice(0, 8)

  const filteredRecipients = form.targetPerson
    ? recipients.filter((r) => r.toLowerCase().includes(form.targetPerson.toLowerCase()))
    : recipients

  const createTag = useMutation({
    mutationFn: () => api.tags.create({ name: newTag }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setForm((p) => ({ ...p, tagIds: [...p.tagIds, t.id_tag] }))
      setNewTag('')
    },
  })

  const deleteTag = useMutation({
    mutationFn: (id: number) => api.tags.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setForm((p) => ({ ...p, tagIds: p.tagIds.filter((x) => x !== id) }))
    },
  })

  const toggleTag = (id: number) =>
    setForm((p) => ({
      ...p,
      tagIds: p.tagIds.includes(id) ? p.tagIds.filter((x) => x !== id) : [...p.tagIds, id],
    }))

  const save = useMutation({
    mutationFn: () => project
      ? api.projects.update(project.id_project, {
          title: form.title, target_person: form.targetPerson || undefined,
          model_url: form.modelUrl || undefined, comment: form.comment || undefined,
          tag_ids: form.tagIds,
        })
      : api.projects.create({
          title: form.title, target_person: form.targetPerson || undefined,
          model_url: form.modelUrl || undefined, comment: form.comment || undefined,
          tag_ids: form.tagIds,
        }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onDone() },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(''); save.mutate() }} className="space-y-4">
      {error && <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Title</label>
        <input value={form.title} onChange={set('title')} required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Recipient with autocomplete */}
        <div className="relative">
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">For (recipient)</label>
          <input
            value={form.targetPerson}
            onChange={set('targetPerson')}
            onFocus={() => setShowRecipientSuggestions(true)}
            onBlur={() => setTimeout(() => setShowRecipientSuggestions(false), 150)}
            placeholder="Optional"
            autoComplete="off"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
          />
          {showRecipientSuggestions && filteredRecipients.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1730] border border-white/15 rounded-lg shadow-xl overflow-hidden">
              {filteredRecipients.map((r) => (
                <button
                  key={r}
                  type="button"
                  onMouseDown={() => {
                    setForm((p) => ({ ...p, targetPerson: r }))
                    setShowRecipientSuggestions(false)
                  }}
                  className="w-full px-3 py-2 text-left text-white/70 text-sm hover:bg-white/8 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Model URL</label>
          <input type="url" value={form.modelUrl} onChange={set('modelUrl')} placeholder="Makerworld, Thingiverse..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
        </div>
      </div>

      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Notes</label>
        <textarea value={form.comment} onChange={set('comment')} rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30" />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <div key={t.id_tag} className="flex items-center gap-0.5">
              <button type="button" onClick={() => toggleTag(t.id_tag)}
                className={`text-xs px-2.5 py-1 rounded-l-full border-y border-l transition-colors ${
                  form.tagIds.includes(t.id_tag)
                    ? 'border-light-blue/50 bg-light-blue/15 text-light-blue'
                    : 'border-white/15 text-white/50 hover:border-white/30'
                }`}
                style={t.color ? { borderColor: `${t.color}60`, backgroundColor: form.tagIds.includes(t.id_tag) ? `${t.color}20` : undefined, color: form.tagIds.includes(t.id_tag) ? t.color : undefined } : {}}>
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => { if (window.confirm(`Delete tag "${t.name}"?`)) deleteTag.mutate(t.id_tag) }}
                className="text-xs px-1.5 py-1 rounded-r-full border-y border-r border-white/15 text-white/25 hover:text-vibrant-orange hover:border-vibrant-orange/30 transition-colors"
                title="Delete tag"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-light-blue/50" />
          <button type="button" onClick={() => newTag.trim() && createTag.mutate()}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white/80 transition-colors">
            Add
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-white/15 text-white/60 hover:text-white/80 text-sm transition-colors">Cancel</button>
        <button type="submit" disabled={save.isPending}
          className="flex-1 py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50">
          {save.isPending ? 'Saving...' : project ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </form>
  )
}
