import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Spool, type Rack, type Preference } from "../api/client";
import WeightBar from "./WeightBar";

interface Props {
  spool: Spool | null;
  racks: Rack[];
  onClose: () => void;
  onEdit: (s: Spool) => void;
}

export default function SpoolDetailPanel({
  spool,
  racks,
  onClose,
  onEdit,
}: Props): React.ReactElement {
  const qc = useQueryClient();
  const [weight, setWeight] = useState(0);
  const [notes, setNotes] = useState("");
  const [rackId, setRackId] = useState<number | null>(null);
  const [isSpooled, setIsSpooled] = useState(true);
  const [isDry, setIsDry] = useState(true);
  const [rfidInput, setRfidInput] = useState("");
  const [prefForm, setPrefForm] = useState<Partial<Preference>>({});
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (spool) {
      setWeight(spool.weight_remaining_grams);
      setNotes(spool.notes ?? "");
      setRackId(spool.id_rack ?? null);
      setIsSpooled(spool.is_spooled);
      setIsDry(spool.is_dry);
      setRfidInput("");
    }
  }, [spool?.id_spool]);

  const { data: prefs } = useQuery({
    queryKey: ["preferences", spool?.id_filament],
    queryFn: () => api.preferences.get(spool!.id_filament),
    enabled: !!spool?.id_filament,
    retry: false,
  });

  useEffect(() => {
    if (prefs) setPrefForm(prefs);
  }, [prefs]);

  const updateWeight = useMutation({
    mutationFn: ({ id, w }: { id: number; w: number }) =>
      api.spools.updateWeight(id, w),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spools"] }),
  });

  const updateSpool = useMutation({
    mutationFn: (patch: Partial<Pick<Spool, "is_spooled" | "is_dry" | "id_rack" | "notes">>) =>
      api.spools.update(spool!.id_spool, {
        is_spooled: isSpooled,
        is_dry: isDry,
        weight_remaining_grams: weight,
        id_rack: rackId ?? undefined,
        notes: notes || undefined,
        ...patch,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spools"] }),
  });

  const deleteSpool = useMutation({
    mutationFn: (id: number) => api.spools.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spools"] });
      onClose();
    },
  });

  const assignRFID = useMutation({
    mutationFn: ({ id, tag }: { id: number; tag: string }) =>
      api.rfid.assign(id, tag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spools"] });
      setRfidInput("");
    },
  });

  const unassignRFID = useMutation({
    mutationFn: (id: number) => api.rfid.unassign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spools"] }),
  });

  const savePrefs = useMutation({
    mutationFn: () =>
      api.preferences.upsert(spool!.id_filament, prefForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences", spool?.id_filament] });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    },
  });

  const deletePrefs = useMutation({
    mutationFn: () => api.preferences.delete(spool!.id_filament),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences", spool?.id_filament] });
      setPrefForm({});
    },
  });

  const f = spool?.filament;
  const maxWeight = f?.weight_grams ?? 1000;

  const handleWeightBlur = () => {
    if (!spool) return;
    const clamped = Math.max(1, Math.min(weight, maxWeight));
    setWeight(clamped);
    if (clamped !== spool.weight_remaining_grams) {
      updateWeight.mutate({ id: spool.id_spool, w: clamped });
    }
  };

  const handleToggle = (field: "is_spooled" | "is_dry", value: boolean) => {
    if (field === "is_spooled") setIsSpooled(value);
    else setIsDry(value);
    updateSpool.mutate({ [field]: value });
  };

  const handleRackChange = (val: string) => {
    const id = val === "" ? null : Number(val);
    setRackId(id);
    updateSpool.mutate({ id_rack: id ?? undefined });
  };

  const handleNotesBlur = () => {
    if (!spool) return;
    if ((notes || "") !== (spool.notes ?? "")) {
      updateSpool.mutate({ notes: notes || undefined });
    }
  };

  return (
    <AnimatePresence>
      {spool && (
        <motion.aside
          key="panel"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-80 shrink-0 border-l border-white/8 flex flex-col h-full overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h3 className="text-sm font-semibold text-white/80">Spool details</h3>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 text-lg"
            >
              ×
            </button>
          </div>

          <div className="flex-1 px-5 py-5 space-y-6">
            {/* Image or color + title */}
            <div className="flex items-center gap-4">
              {f?.image_url ? (
                <img
                  src={f.image_url}
                  alt={f.title}
                  className="w-16 h-16 rounded-xl border border-white/15 object-cover shadow-lg shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl border border-white/15 shadow-lg shrink-0"
                  style={{ backgroundColor: f?.color_hex ?? "#808080" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{f?.title ?? "—"}</p>
                <p className="text-white/50 text-xs mt-0.5">{f?.brand?.name ?? "—"}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: f?.color_hex ?? "#808080" }}
                  />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/60">
                    {f?.material_type ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Weight */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                Remaining weight
              </p>
              <WeightBar remaining={weight} total={maxWeight} size="md" />
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="range"
                  min={1}
                  max={maxWeight}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  onMouseUp={handleWeightBlur}
                  className="flex-1 accent-light-blue"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weight}
                    min={1}
                    max={maxWeight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    onBlur={handleWeightBlur}
                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-light-blue/50"
                  />
                  <span className="text-white/40 text-xs">g</span>
                </div>
              </div>
              {f?.brand?.empty_spool_weight_grams != null && (
                <p className="text-white/30 text-xs mt-1">
                  Empty spool: {f.brand.empty_spool_weight_grams}g
                </p>
              )}
            </div>

            {/* In-place toggles */}
            <div className="space-y-3">
              <p className="text-white/50 text-xs uppercase tracking-wider">Status</p>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">Spooled</span>
                <button
                  onClick={() => handleToggle("is_spooled", !isSpooled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    isSpooled ? "bg-vibrant-green" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isSpooled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">Dried</span>
                <button
                  onClick={() => handleToggle("is_dry", !isDry)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    isDry ? "bg-light-blue" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isDry ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Rack inline edit */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Rack</p>
              <select
                value={rackId ?? ""}
                onChange={(e) => handleRackChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-light-blue/50"
              >
                <option value="">Unassigned</option>
                {racks.map((r) => (
                  <option key={r.id_rack} value={r.id_rack}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes inline edit */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
                placeholder="Add notes..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs resize-none focus:outline-none focus:border-light-blue/50 placeholder-white/20"
              />
            </div>

            {/* RFID tag */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">RFID tag</p>
              {spool.rfid_tag ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-mono text-light-blue/80 bg-deep-purple/40 border border-light-blue/20 rounded-lg px-3 py-2 truncate">
                    {spool.rfid_tag}
                  </span>
                  <button
                    onClick={() => unassignRFID.mutate(spool.id_spool)}
                    className="text-xs text-vibrant-orange/60 hover:text-vibrant-orange transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    placeholder="Enter RFID tag..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-light-blue/50 font-mono"
                  />
                  <button
                    disabled={!rfidInput.trim()}
                    onClick={() => assignRFID.mutate({ id: spool.id_spool, tag: rfidInput.trim() })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-light-blue/20 hover:bg-light-blue/30 text-light-blue transition-colors disabled:opacity-40"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>

            {/* Filament preferences */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs uppercase tracking-wider">My preferences</p>
                {(prefs || Object.keys(prefForm).some((k) => prefForm[k as keyof Preference] != null)) && (
                  <button
                    onClick={() => deletePrefs.mutate()}
                    className="text-xs text-vibrant-orange/50 hover:text-vibrant-orange transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Nozzle override (°C)", key: "nozzle_temp_override" as const },
                    { label: "Bed override (°C)", key: "bed_temp_override" as const },
                    { label: "Ironing flow (%)", key: "ironing_flow" as const },
                    { label: "Ironing speed (mm/s)", key: "ironing_speed" as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <p className="text-white/30 text-xs mb-1">{label}</p>
                      <input
                        type="number"
                        value={prefForm[key] ?? ""}
                        onChange={(e) =>
                          setPrefForm((p) => ({
                            ...p,
                            [key]: e.target.value === "" ? undefined : Number(e.target.value),
                          }))
                        }
                        placeholder="—"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-light-blue/50 placeholder-white/20"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white/30 text-xs mb-1">Notes</p>
                  <textarea
                    value={prefForm.notes ?? ""}
                    onChange={(e) => setPrefForm((p) => ({ ...p, notes: e.target.value || undefined }))}
                    rows={2}
                    placeholder="Personal notes for this filament..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs resize-none focus:outline-none focus:border-light-blue/50 placeholder-white/20"
                  />
                </div>
                <button
                  onClick={() => savePrefs.mutate()}
                  className="w-full py-1.5 text-xs rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white/80 transition-colors"
                >
                  {prefSaved ? "Saved!" : "Save preferences"}
                </button>
              </div>
            </div>

            {/* Print specs */}
            {(f?.nozzle_temp_min || f?.bed_temp_min) && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                  Print settings
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {f.nozzle_temp_min && f.nozzle_temp_max && (
                    <div className="glass rounded-lg px-3 py-2">
                      <p className="text-white/40 text-xs">Nozzle</p>
                      <p className="text-white/80 text-sm font-medium">
                        {f.nozzle_temp_min}–{f.nozzle_temp_max}°C
                      </p>
                    </div>
                  )}
                  {f.bed_temp_min && f.bed_temp_max && (
                    <div className="glass rounded-lg px-3 py-2">
                      <p className="text-white/40 text-xs">Bed</p>
                      <p className="text-white/80 text-sm font-medium">
                        {f.bed_temp_min}–{f.bed_temp_max}°C
                      </p>
                    </div>
                  )}
                  {f.dry_temp && (
                    <div className="glass rounded-lg px-3 py-2">
                      <p className="text-white/40 text-xs">Dry temp</p>
                      <p className="text-white/80 text-sm font-medium">
                        {f.dry_temp}°C {f.dry_time ? `/ ${f.dry_time}h` : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-white/8 flex gap-2">
            <button
              onClick={() => onEdit(spool)}
              className="flex-1 text-sm text-white/60 hover:text-white/80 transition-colors py-2 border border-white/15 hover:border-white/30 rounded-lg"
            >
              Full edit
            </button>
            <button
              onClick={() => {
                if (window.confirm("Delete this spool?"))
                  deleteSpool.mutate(spool.id_spool);
              }}
              className="flex-1 text-sm text-vibrant-orange/70 hover:text-vibrant-orange transition-colors py-2 border border-vibrant-orange/20 hover:border-vibrant-orange/40 rounded-lg"
            >
              Remove
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
