import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Spool, type Filament } from "../../api/client";
import FilamentSearchInput from "../FilamentSearchInput";

interface Props {
  spool?: Spool | null;
  onDone: () => void;
}

export default function SpoolForm({
  spool,
  onDone,
}: Props): React.ReactElement {
  const qc = useQueryClient();
  const isEdit = !!spool;

  const [filament, setFilament] = useState<Filament | null>(
    spool?.filament ?? null,
  );
  const [form, setForm] = useState({
    weight: spool?.weight_remaining_grams ?? filament?.weight_grams ?? 1000,
    rackId: spool?.id_rack ? String(spool.id_rack) : "",
    notes: spool?.notes ?? "",
    isSpooled: spool?.is_spooled ?? true,
    isDry: spool?.is_dry ?? true,
  });
  const [error, setError] = useState("");

  const { data: racks = [] } = useQuery({
    queryKey: ["racks"],
    queryFn: () => api.racks.list(),
  });

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const v =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((p) => ({ ...p, [k]: v }));
    };

  const create = useMutation({
    mutationFn: () =>
      api.spools.create({
        id_filament: filament!.id_filament,
        weight_remaining_grams: Number(form.weight),
        id_rack: form.rackId ? Number(form.rackId) : undefined,
        notes: form.notes || undefined,
        is_spooled: form.isSpooled,
        is_dry: form.isDry,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spools"] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  const update = useMutation({
    mutationFn: () =>
      api.spools.update(spool!.id_spool, {
        weight_remaining_grams: Number(form.weight),
        id_rack: form.rackId ? Number(form.rackId) : undefined,
        notes: form.notes || undefined,
        is_spooled: form.isSpooled,
        is_dry: form.isDry,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spools"] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!filament && !isEdit) {
      setError("Select a filament");
      return;
    }
    if (isEdit) update.mutate();
    else create.mutate();
  };

  const loading = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!isEdit && (
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Filament
          </label>
          <FilamentSearchInput
            value={filament}
            onChange={(f) => {
              setFilament(f);
              if (f) setForm((p) => ({ ...p, weight: f.weight_grams }));
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Weight remaining (g)
          </label>
          <input
            type="number"
            value={form.weight}
            onChange={set("weight")}
            min={1}
            max={filament?.weight_grams ?? 5000}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
          />
        </div>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Storage rack
          </label>
          <select
            value={form.rackId}
            onChange={set("rackId")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50"
          >
            <option value="">No rack</option>
            {racks.map((r) => (
              <option key={r.id_rack} value={r.id_rack}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={set("notes")}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
        />
      </div>

      <div>
        <label className="block text-white/50 text-xs uppercase tracking-wider mb-3">
          Status
        </label>
        <div className="flex gap-3">
          <label
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
              form.isSpooled
                ? "border-light-blue/50 bg-light-blue/10"
                : "border-white/15 bg-white/5 hover:border-white/25"
            }`}
          >
            <input
              type="checkbox"
              checked={form.isSpooled}
              onChange={set("isSpooled")}
              className="w-5 h-5 accent-light-blue rounded cursor-pointer"
            />
            <span
              className={`text-sm font-medium ${form.isSpooled ? "text-light-blue" : "text-white/60"}`}
            >
              On spool
            </span>
          </label>
          <label
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
              form.isDry
                ? "border-dark-teal/50 bg-dark-teal/10"
                : "border-white/15 bg-white/5 hover:border-white/25"
            }`}
          >
            <input
              type="checkbox"
              checked={form.isDry}
              onChange={set("isDry")}
              className="w-5 h-5 accent-dark-teal rounded cursor-pointer"
            />
            <span
              className={`text-sm font-medium ${form.isDry ? "text-dark-teal" : "text-white/60"}`}
            >
              Dried
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-white/15 text-white/60 hover:text-white/80 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Save changes" : "Add spool"}
        </button>
      </div>
    </form>
  );
}
