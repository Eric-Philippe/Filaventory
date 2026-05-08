import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { api, type Spool, type Rack } from "../api/client";

interface Props {
  spools: Spool[];
  racks: Rack[];
  onSelect: (s: Spool) => void;
  selectedId?: number;
}

export default function RackView({
  spools,
  racks,
  onSelect,
  selectedId,
}: Props): React.ReactElement {
  const qc = useQueryClient();
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const moveToRack = useMutation({
    mutationFn: ({ spoolId, rackId }: { spoolId: number; rackId: number | null }) =>
      api.spools.updateRack(spoolId, rackId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spools"] }),
  });

  const handleDragStart = (e: DragStartEvent) => setDraggingId(Number(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const spoolId = Number(active.id);
    const rackId = over.id === "unassigned" ? null : Number(over.id);
    const spool = spools.find((s) => s.id_spool === spoolId);
    if (!spool) return;
    const currentRack = spool.id_rack ?? null;
    if (rackId === currentRack) return;
    moveToRack.mutate({ spoolId, rackId });
  };

  const byRack = (rackId: number | null) =>
    spools.filter((s) => (s.id_rack ?? null) === rackId);

  const draggingSpool = draggingId != null ? spools.find((s) => s.id_spool === draggingId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <LayoutGroup>
        <div className="space-y-6">
          {racks.map((rack) => (
            <RackColumn
              key={rack.id_rack}
              rack={rack}
              spools={byRack(rack.id_rack)}
              onSelect={onSelect}
              selectedId={selectedId}
              draggingId={draggingId}
            />
          ))}

          <UnassignedZone
            spools={byRack(null)}
            onSelect={onSelect}
            selectedId={selectedId}
            draggingId={draggingId}
          />
        </div>
      </LayoutGroup>

      <DragOverlay>
        {draggingSpool && <SpoolChip spool={draggingSpool} selected={false} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function RackColumn({
  rack,
  spools,
  onSelect,
  selectedId,
  draggingId,
}: {
  rack: Rack;
  spools: Spool[];
  onSelect: (s: Spool) => void;
  selectedId?: number;
  draggingId: number | null;
}): React.ReactElement {
  const { isOver, setNodeRef } = useDroppable({ id: rack.id_rack });
  const usedSlots = spools.length;
  const maxSlots = rack.max_capacity ?? 12;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-medium text-white/70">{rack.name}</h3>
        <span className="text-xs text-white/30">
          {usedSlots} / {maxSlots} slots
        </span>
        <div className="flex-1 h-px bg-white/8" />
      </div>
      <div
        ref={setNodeRef}
        className={`grid gap-2 p-3 rounded-xl border transition-colors duration-150 min-h-16 ${
          isOver
            ? "border-light-blue/40 bg-light-blue/5"
            : "border-white/8 bg-white/2"
        }`}
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))" }}
      >
        {spools.map((s) => (
          <DraggableSpool
            key={s.id_spool}
            spool={s}
            onSelect={onSelect}
            selected={selectedId === s.id_spool}
          />
        ))}
        {Array.from({ length: Math.max(0, maxSlots - usedSlots) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-14 h-14 rounded-lg border border-dashed border-white/8"
          />
        ))}
      </div>
    </div>
  );
}

function UnassignedZone({
  spools,
  onSelect,
  selectedId,
}: {
  spools: Spool[];
  onSelect: (s: Spool) => void;
  selectedId?: number;
  draggingId: number | null;
}): React.ReactElement {
  const { isOver, setNodeRef } = useDroppable({ id: "unassigned" });

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-medium text-white/50">Unassigned</h3>
        <div className="flex-1 h-px bg-white/8" />
      </div>
      <div
        ref={setNodeRef}
        className={`grid gap-2 p-3 rounded-xl border transition-colors duration-150 min-h-16 ${
          isOver
            ? "border-vibrant-orange/40 bg-vibrant-orange/5"
            : "border-white/8 border-dashed"
        }`}
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))" }}
      >
        {spools.map((s) => (
          <DraggableSpool
            key={s.id_spool}
            spool={s}
            onSelect={onSelect}
            selected={selectedId === s.id_spool}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableSpool({
  spool,
  onSelect,
  selected,
}: {
  spool: Spool;
  onSelect: (s: Spool) => void;
  selected: boolean;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: spool.id_spool,
  });

  return (
    <motion.div
      layout
      layoutId={`spool-${spool.id_spool}`}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(spool)}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: isDragging ? 0.95 : 1 }}
      className={`w-14 h-14 rounded-lg border cursor-grab active:cursor-grabbing overflow-hidden ${
        selected ? "border-light-blue/60 ring-1 ring-light-blue/30" : "border-white/15 hover:border-white/30"
      }`}
      style={{ borderRadius: 8 }}
      title={`${spool.filament?.brand?.name} — ${spool.filament?.title}`}
    >
      <SpoolChip spool={spool} selected={selected} />
    </motion.div>
  );
}

function SpoolChip({
  spool,
  overlay = false,
}: {
  spool: Spool;
  selected: boolean;
  overlay?: boolean;
}): React.ReactElement {
  const f = spool.filament;
  const cls = overlay
    ? "w-14 h-14 rounded-lg border border-white/20 overflow-hidden shadow-xl"
    : "w-full h-full";

  if (f?.image_url) {
    return (
      <div className={cls}>
        <img src={f.image_url} alt={f.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${cls} flex items-end justify-end p-1`}
      style={{ backgroundColor: f?.color_hex ?? "#808080" }}
    >
      <div className="w-2 h-2 rounded-full bg-black/30" title={`${spool.weight_remaining_grams}g`} />
    </div>
  );
}
