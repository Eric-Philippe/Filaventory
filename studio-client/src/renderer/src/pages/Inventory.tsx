import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, type Spool } from "../api/client";
import FilterBar, {
  type Filters,
  type ViewMode,
  type SortKey,
} from "../components/FilterBar";
import SpoolCard from "../components/SpoolCard";
import SpoolRow from "../components/SpoolRow";
import RackView from "../components/RackView";
import SpoolDetailPanel from "../components/SpoolDetailPanel";
import Modal from "../components/Modal";
import SpoolForm from "../components/forms/SpoolForm";
import RackForm from "../components/forms/RackForm";

export default function Inventory(): React.ReactElement {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    material: "",
    rack_id: "",
  });
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("default");
  const [selected, setSelected] = useState<Spool | null>(null);
  const [addSpoolOpen, setAddSpoolOpen] = useState(false);
  const [editSpool, setEditSpool] = useState<Spool | null>(null);
  const [addRackOpen, setAddRackOpen] = useState(false);

  const {
    data: spools = [],
    isLoading,
    error: spoolsError,
  } = useQuery({
    queryKey: ["spools", filters],
    queryFn: () =>
      api.spools.list({
        q: filters.q || undefined,
        material: filters.material || undefined,
        rack_id:
          filters.rack_id === "none" ? "none" : filters.rack_id || undefined,
      }),
  });

  const { data: racks = [], error: racksError } = useQuery({
    queryKey: ["racks"],
    queryFn: () => api.racks.list(),
  });

  const sortedSpools = useMemo(() => {
    const cmp = (a: Spool, b: Spool): number => {
      switch (sort) {
        case "weight":
          return b.weight_remaining_grams - a.weight_remaining_grams;
        case "brand":
          return (a.filament?.brand?.name ?? "").localeCompare(b.filament?.brand?.name ?? "");
        case "type":
          return (a.filament?.material_type ?? "").localeCompare(b.filament?.material_type ?? "");
        case "created_at":
          return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
        default:
          // brand → type → name → acquired_at
          return (
            (a.filament?.brand?.name ?? "").localeCompare(b.filament?.brand?.name ?? "") ||
            (a.filament?.material_type ?? "").localeCompare(b.filament?.material_type ?? "") ||
            (a.filament?.title ?? "").localeCompare(b.filament?.title ?? "") ||
            new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
          );
      }
    };
    return [...spools].sort(cmp);
  }, [spools, sort]);

  // Stats
  const totalWeight = spools.reduce(
    (s, sp) => s + sp.weight_remaining_grams,
    0,
  );
  const materials = [
    ...new Set(spools.map((s) => s.filament?.material_type).filter(Boolean)),
  ];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 p-6 gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Inventory</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {spools.length} spools &middot; {(totalWeight / 1000).toFixed(2)}{" "}
              kg &middot; {materials.length} materials
            </p>
          </div>
          <button
            onClick={() => setAddRackOpen(true)}
            className="text-sm text-white/40 hover:text-white/70 border border-white/15 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Manage racks
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Spools", value: spools.length, accent: "bg-light-blue" },
            {
              label: "Total weight",
              value: `${(totalWeight / 1000).toFixed(1)} kg`,
              accent: "bg-vibrant-orange",
            },
            {
              label: "Materials",
              value: materials.length,
              accent: "bg-vibrant-green",
            },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className={`w-1 h-8 ${c.accent} rounded-full`} />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-white font-semibold text-lg">{c.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <FilterBar
          filters={filters}
          onFilters={setFilters}
          view={view}
          onView={setView}
          onAdd={() => setAddSpoolOpen(true)}
          sort={sort}
          onSort={setSort}
        />

        {/* Content */}
        {spoolsError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <p className="text-vibrant-orange text-sm">
              Error loading spools: {(spoolsError as any).message}
            </p>
            <p className="text-white/30 text-xs mt-2">
              Check your connection and try refreshing
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center flex-1 py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-white/15 border-t-light-blue rounded-full"
            />
          </div>
        ) : spools.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <p className="text-white/30 text-sm">No spools found.</p>
            {!filters.q && !filters.material && (
              <button
                onClick={() => setAddSpoolOpen(true)}
                className="mt-3 text-light-blue text-sm hover:text-light-blue/70 transition-colors"
              >
                Add your first spool
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {sortedSpools.map((s, i) => (
              <SpoolCard
                key={s.id_spool}
                spool={s}
                index={i}
                selected={selected?.id_spool === s.id_spool}
                onClick={() =>
                  setSelected(selected?.id_spool === s.id_spool ? null : s)
                }
              />
            ))}
          </div>
        ) : view === "list" ? (
          <div className="space-y-0.5">
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 text-white/30 text-xs uppercase tracking-wider">
              <div className="w-8" />
              <div className="w-48">Filament</div>
              <div className="w-20">Material</div>
              <div className="flex-1">Weight</div>
              <div className="w-24 text-right">Rack</div>
              <div className="w-16" />
            </div>
            {sortedSpools.map((s, i) => (
              <SpoolRow
                key={s.id_spool}
                spool={s}
                index={i}
                selected={selected?.id_spool === s.id_spool}
                onClick={() =>
                  setSelected(selected?.id_spool === s.id_spool ? null : s)
                }
              />
            ))}
          </div>
        ) : (
          <RackView
            spools={spools}
            racks={racks}
            selectedId={selected?.id_spool}
            onSelect={(s) =>
              setSelected(selected?.id_spool === s.id_spool ? null : s)
            }
          />
        )}
      </div>

      {/* Detail panel */}
      <SpoolDetailPanel
        spool={selected}
        racks={racks}
        onClose={() => setSelected(null)}
        onEdit={(s) => {
          setEditSpool(s);
          setSelected(null);
        }}
      />

      {/* Modals */}
      <Modal
        open={addSpoolOpen}
        onClose={() => setAddSpoolOpen(false)}
        title="Add spool"
        width="max-w-2xl"
      >
        <SpoolForm onDone={() => setAddSpoolOpen(false)} />
      </Modal>
      <Modal
        open={!!editSpool}
        onClose={() => setEditSpool(null)}
        title="Edit spool"
        width="max-w-2xl"
      >
        <SpoolForm spool={editSpool} onDone={() => setEditSpool(null)} />
      </Modal>
      <Modal
        open={addRackOpen}
        onClose={() => setAddRackOpen(false)}
        title="New rack"
      >
        <RackForm onDone={() => setAddRackOpen(false)} />
      </Modal>
    </div>
  );
}
