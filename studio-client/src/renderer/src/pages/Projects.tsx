import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api, type Project, type Spool, type WishlistItem } from '../api/client'
import Modal from '../components/Modal'
import ProjectForm from '../components/forms/ProjectForm'
import FilamentSearchInput from '../components/FilamentSearchInput'

// ── Link filament modal ──────────────────────────────────────────────────────

function LinkFilamentModal({
  project,
  onClose,
}: {
  project: Project
  onClose: () => void
}): React.ReactElement {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'spool' | 'wish'>('spool')

  // Use live project data so the linked list updates after each add/remove
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })
  const liveProject = allProjects.find((p) => p.id_project === project.id_project) ?? project

  const { data: spools = [] } = useQuery({
    queryKey: ['spools'],
    queryFn: () => api.spools.list(),
  })
  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.wishlist.list(),
  })

  const linkedSpoolIds = new Set(liveProject.filaments.map((f) => f.id_spool).filter(Boolean))
  const linkedWishIds = new Set(liveProject.filaments.map((f) => f.id_wish).filter(Boolean))

  const addFilament = useMutation({
    mutationFn: (body: { id_spool?: number; id_wish?: number }) =>
      api.projects.addFilament(project.id_project, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
  const removeFilament = useMutation({
    mutationFn: (linkId: number) =>
      api.projects.removeFilament(project.id_project, linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const availableSpools = spools.filter((s) => !linkedSpoolIds.has(s.id_spool))
  const availableWish = wishlist.filter((w) => !linkedWishIds.has(w.id_wish))

  return (
    <div className="space-y-4">
      {/* Currently linked */}
      {liveProject.filaments.length > 0 && (
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Linked filaments</p>
          <div className="space-y-1">
            {liveProject.filaments.map((link) => {
              const f = link.spool?.filament ?? link.wish?.filament
              return (
                <div key={link.id_link} className="flex items-center gap-3 px-3 py-2 glass rounded-lg">
                  {f?.image_url ? (
                    <img src={f.image_url} alt={f.title} className="w-8 h-8 rounded object-cover border border-white/15 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded border border-white/15 shrink-0"
                      style={{ backgroundColor: f?.color_hex ?? '#808080' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs truncate">{f?.title ?? '—'}</p>
                    <p className="text-white/40 text-xs">{link.spool ? `Spool · ${link.spool.weight_remaining_grams}g` : 'Wishlist'}</p>
                  </div>
                  <button
                    onClick={() => removeFilament.mutate(link.id_link)}
                    className="text-vibrant-orange/50 hover:text-vibrant-orange text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(['spool', 'wish'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              tab === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'spool' ? 'Owned spools' : 'Wishlist'}
          </button>
        ))}
      </div>

      {/* Available items */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {(tab === 'spool' ? availableSpools : availableWish).length === 0 ? (
          <p className="text-white/30 text-xs text-center py-4">
            {tab === 'spool' ? 'No unlinked spools' : 'No unlinked wishlist items'}
          </p>
        ) : (
          (tab === 'spool' ? availableSpools : availableWish).map((item) => {
            const f = (item as Spool).filament ?? (item as WishlistItem).filament
            const isSpool = 'id_spool' in item
            return (
              <button
                key={isSpool ? (item as Spool).id_spool : (item as WishlistItem).id_wish}
                onClick={() =>
                  addFilament.mutate(
                    isSpool
                      ? { id_spool: (item as Spool).id_spool }
                      : { id_wish: (item as WishlistItem).id_wish },
                  )
                }
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left"
              >
                {f?.image_url ? (
                  <img src={f.image_url} alt={f.title} className="w-8 h-8 rounded object-cover border border-white/15 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded border border-white/15 shrink-0"
                    style={{ backgroundColor: f?.color_hex ?? '#808080' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs truncate">{f?.title ?? '—'}</p>
                  <p className="text-white/40 text-xs">
                    {f?.brand?.name} · {f?.material_type}
                    {isSpool ? ` · ${(item as Spool).weight_remaining_grams}g` : ''}
                  </p>
                </div>
                <span className="text-vibrant-green text-xs">+ Add</span>
              </button>
            )
          })
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 text-sm text-white/50 hover:text-white/80 border border-white/15 rounded-lg transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ── Sortable project card ────────────────────────────────────────────────────

function SortableProjectCard({
  project,
  onEdit,
  onDelete,
  onLinkFilament,
}: {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
  onLinkFilament: (p: Project) => void
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id_project,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const totalWeight = project.filaments.reduce((sum, f) => {
    return sum + (f.spool?.weight_remaining_grams ?? 0)
  }, 0)

  return (
    <div ref={setNodeRef} style={style} className="glass rounded-xl px-4 py-3 flex gap-3 items-start">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-white/20 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing shrink-0"
        tabIndex={-1}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">{project.title}</p>
            {project.target_person && (
              <p className="text-white/40 text-xs mt-0.5">For: {project.target_person}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onEdit(project)} className="text-xs text-white/40 hover:text-white/80 transition-colors">Edit</button>
            <button
              onClick={() => { if (window.confirm('Delete this project?')) onDelete(project.id_project) }}
              className="text-xs text-vibrant-orange/50 hover:text-vibrant-orange transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {project.tags.map((t) => (
              <span
                key={t.id_tag}
                className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-white/50"
                style={t.color ? { borderColor: `${t.color}60`, color: t.color, backgroundColor: `${t.color}15` } : {}}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Filaments */}
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          {project.filaments.map((f) => {
            const fil = f.spool?.filament ?? f.wish?.filament
            return (
              <div key={f.id_link} className="flex items-center gap-1 text-xs text-white/50">
                {fil?.image_url ? (
                  <img src={fil.image_url} alt={fil.title} className="w-5 h-5 rounded object-cover border border-white/20" />
                ) : (
                  <div className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: fil?.color_hex ?? '#808080' }} />
                )}
                <span className="truncate max-w-[100px]">{fil?.title ?? '—'}</span>
                {f.spool && <span className="text-white/30">({f.spool.weight_remaining_grams}g)</span>}
              </div>
            )
          })}
          <button
            onClick={() => onLinkFilament(project)}
            className="text-xs text-light-blue/60 hover:text-light-blue transition-colors ml-1"
          >
            + filament
          </button>
        </div>

        {/* Weight total + model URL + comment */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {totalWeight > 0 && (
            <span className="text-xs text-vibrant-green/70 font-medium">
              {totalWeight.toFixed(0)}g total
            </span>
          )}
          {project.model_url && (
            <a href={project.model_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-light-blue hover:underline truncate max-w-xs">
              {project.model_url}
            </a>
          )}
          {project.comment && (
            <p className="text-xs text-white/30 truncate max-w-xs">{project.comment}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Projects page ───────────────────────────────────────────────────────

function ProjectGridCard({
  project,
  onEdit,
  onDelete,
  onLinkFilament,
}: {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
  onLinkFilament: (p: Project) => void
}): React.ReactElement {
  const filaments = project.filaments.slice(0, 6)
  const extra = project.filaments.length - filaments.length

  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white/90 text-sm font-medium leading-snug">{project.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onEdit(project)} className="text-xs text-white/30 hover:text-white/70 transition-colors">Edit</button>
          <button
            onClick={() => { if (window.confirm('Delete this project?')) onDelete(project.id_project) }}
            className="text-xs text-vibrant-orange/40 hover:text-vibrant-orange transition-colors"
          >✕</button>
        </div>
      </div>

      {project.target_person && (
        <p className="text-white/40 text-xs">For: {project.target_person}</p>
      )}

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.map((t) => (
            <span key={t.id_tag} className="text-xs px-1.5 py-0.5 rounded-full border border-white/15 text-white/50"
              style={t.color ? { borderColor: `${t.color}60`, color: t.color, backgroundColor: `${t.color}15` } : {}}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 items-center mt-auto">
        {filaments.map((f) => {
          const fil = f.spool?.filament ?? f.wish?.filament
          return fil?.image_url ? (
            <img key={f.id_link} src={fil.image_url} alt={fil.title} title={fil.title}
              className="w-6 h-6 rounded object-cover border border-white/20" />
          ) : (
            <div key={f.id_link} className="w-6 h-6 rounded border border-white/20"
              style={{ backgroundColor: fil?.color_hex ?? '#808080' }} title={fil?.title} />
          )
        })}
        {extra > 0 && <span className="text-white/30 text-xs">+{extra}</span>}
        <button onClick={() => onLinkFilament(project)} className="text-xs text-light-blue/50 hover:text-light-blue transition-colors ml-1">+</button>
      </div>
    </div>
  )
}

export default function Projects(): React.ReactElement {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [linkProject, setLinkProject] = useState<Project | null>(null)
  const [localOrder, setLocalOrder] = useState<number[] | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Filters
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<number | null>(null)
  const [filterRecipient, setFilterRecipient] = useState('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    select: (data) => [...data].sort((a, b) => a.priority - b.priority),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
  })

  const orderedProjects = localOrder
    ? localOrder.map((id) => projects.find((p) => p.id_project === id)!).filter(Boolean)
    : projects

  const recipients = [...new Set(projects.map((p) => p.target_person).filter(Boolean))] as string[]

  const filtered = useMemo(() => {
    return orderedProjects.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterTag && !p.tags.some((t) => t.id_tag === filterTag)) return false
      if (filterRecipient && p.target_person !== filterRecipient) return false
      return true
    })
  }, [orderedProjects, search, filterTag, filterRecipient])

  const deleteProject = useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.projects.reorder(ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setLocalOrder(null) },
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = orderedProjects.map((p) => p.id_project)
    const oldIndex = ids.indexOf(active.id as number)
    const newIndex = ids.indexOf(over.id as number)
    const newOrder = arrayMove(ids, oldIndex, newIndex)
    setLocalOrder(newOrder)
    reorder.mutate(newOrder)
  }

  const hasFilters = search || filterTag || filterRecipient

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-0.5">{projects.length} projects</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(['list', 'grid'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs transition-colors ${viewMode === mode ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>
                {mode === 'list' ? '☰' : '⊞'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vibrant-orange hover:bg-vibrant-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> New project
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {projects.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 min-w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50"
          />
          <select
            value={filterTag ?? ''}
            onChange={(e) => setFilterTag(e.target.value ? Number(e.target.value) : null)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-light-blue/50"
          >
            <option value="">All tags</option>
            {tags.map((t) => <option key={t.id_tag} value={t.id_tag}>{t.name}</option>)}
          </select>
          <select
            value={filterRecipient}
            onChange={(e) => setFilterRecipient(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-light-blue/50"
          >
            <option value="">All recipients</option>
            {recipients.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterTag(null); setFilterRecipient('') }}
              className="text-xs text-white/40 hover:text-white/70 px-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white/15 border-t-light-blue rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-white/30 text-sm">No projects yet.</p>
          <button onClick={() => setAddOpen(true)} className="mt-3 text-light-blue text-sm hover:text-light-blue/70 transition-colors">
            Create your first project
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-white/30 text-sm">No projects match filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <motion.div key={project.id_project}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <ProjectGridCard
                project={project}
                onEdit={setEditProject}
                onDelete={(id) => deleteProject.mutate(id)}
                onLinkFilament={setLinkProject}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((p) => p.id_project)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              <div className="space-y-2">
                {filtered.map((project) => (
                  <motion.div
                    key={project.id_project}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SortableProjectCard
                      project={project}
                      onEdit={setEditProject}
                      onDelete={(id) => deleteProject.mutate(id)}
                      onLinkFilament={setLinkProject}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New project">
        <ProjectForm onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit project">
        <ProjectForm project={editProject} onDone={() => setEditProject(null)} />
      </Modal>
      <Modal open={!!linkProject} onClose={() => setLinkProject(null)} title={`Link filament — ${linkProject?.title}`}>
        {linkProject && <LinkFilamentModal project={linkProject} onClose={() => setLinkProject(null)} />}
      </Modal>
    </div>
  )
}
